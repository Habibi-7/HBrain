"""Typer CLI — the presentation layer.

Wraps domain commands with the response envelope, metrics footer, and exit
codes. Two output modes: JSON envelope for agents (auto-detected or --agent),
clean text plus a `[exit | duration | cost | artifact]` footer for humans.
"""

from __future__ import annotations

import json
import os
import time
from collections.abc import Callable
from datetime import UTC
from pathlib import Path

import typer

from . import __version__
from .commands.add import run_add
from .commands.init import run_init
from .commands.reindex import run_reindex
from .commands.show import run_show
from .commands.timeline import run_timeline
from .config import find_vault
from .envelope import (
    CommandOutput,
    Metrics,
    NextAction,
    detect_agent_mode,
    error_envelope,
    human_footer,
    success_envelope,
)
from .errors import BrainError, ExitCode

# Disable Typer's rich-powered traceback + help prettiness for clean agent IO.
os.environ.setdefault("TYPER_USE_RICH", "0")

app = typer.Typer(
    name="brain",
    help="brain — Living Second Brain CLI",
    add_completion=False,
    rich_markup_mode=None,
    pretty_exceptions_enable=False,
    no_args_is_help=False,
    invoke_without_command=True,
)


# ---------- shared state via context ----------


class _State:
    def __init__(self) -> None:
        self.force_agent: bool = False
        self.force_text: bool = False
        self.vault_override: Path | None = None
        self.agent_name: str = os.environ.get("BRAIN_AGENT_NAME", "unknown")


def _get_state(ctx: typer.Context) -> _State:
    if ctx.obj is None:
        ctx.obj = _State()
    return ctx.obj


# ---------- root callback: shared flags + self-documenting tree ----------


_COMMAND_TREE: list[dict] = [
    {
        "name": "init",
        "usage": "brain init <path>",
        "description": "Scaffold a new vault at <path>.",
    },
    {
        "name": "add",
        "usage": (
            'brain add "<body>" [--type <type>] [--tags <a,b>] '
            "[--link <id>] [--file <path>] [--status <s>]"
        ),
        "description": "Capture a new event. Body from positional, --file, or stdin.",
    },
    {
        "name": "show",
        "usage": "brain show <id>",
        "description": "Read an event back by ULID (or unambiguous prefix).",
    },
    {
        "name": "timeline",
        "usage": (
            "brain timeline [--last <dur>] [--since <date>] [--until <date>] "
            "[--type <type>] [--tag <t>] [--format md] [--write]"
        ),
        "description": "Query events in a time range. Optional markdown artifact.",
    },
    {
        "name": "reindex",
        "usage": "brain reindex",
        "description": "Rebuild the SQLite cache from the markdown vault.",
    },
]


@app.callback(invoke_without_command=True)
def root(
    ctx: typer.Context,
    agent: bool = typer.Option(
        False, "--agent", help="Force JSON envelope output (regardless of tty)."
    ),
    text: bool = typer.Option(False, "--text", help="Force human text output."),
    vault: Path | None = typer.Option(
        None, "--vault", help="Vault root. Defaults to $BRAIN_DIR or walked-up parent."
    ),
    version: bool = typer.Option(False, "--version", help="Print version and exit."),
) -> None:
    state = _get_state(ctx)
    state.force_agent = agent
    state.force_text = text
    state.vault_override = vault

    if version:
        _emit_static(ctx, "brain --version", {"version": __version__})
        raise typer.Exit(0)

    if ctx.invoked_subcommand is None:
        _emit_static(
            ctx,
            "brain",
            {
                "description": "brain — Living Second Brain CLI",
                "version": __version__,
                "commands": _COMMAND_TREE,
            },
            next_actions=[
                NextAction(
                    command="brain init <path>",
                    description="Scaffold a new vault to start capturing",
                ),
                NextAction(
                    command='brain add "<body>" [--type <type>]',
                    description="Capture your first event",
                    params={
                        "type": {
                            "enum": ["note", "task", "decision", "fact", "link"],
                            "default": "note",
                        }
                    },
                ),
                NextAction(
                    command="brain timeline",
                    description="List recent events",
                ),
            ],
            human_summary=_human_command_tree(),
        )
        raise typer.Exit(0)


def _human_command_tree() -> str:
    lines = ["brain — Living Second Brain CLI", ""]
    for c in _COMMAND_TREE:
        lines.append(f"  {c['name']:<8}  {c['description']}")
    lines.append("")
    lines.append("See `brain <command> --help` for per-command options.")
    return "\n".join(lines)


# ---------- wrapper helpers ----------


def _emit_static(
    ctx: typer.Context,
    command_name: str,
    result: dict,
    next_actions: list[NextAction] | None = None,
    human_summary: str = "",
) -> None:
    """Emit a synthetic CommandOutput (no domain function; used by root/version)."""
    state = _get_state(ctx)
    agent_mode = detect_agent_mode(state.force_agent, state.force_text)
    metrics = Metrics(duration_ms=0)
    if agent_mode:
        env = success_envelope(command_name, result, next_actions or [], metrics)
        typer.echo(json.dumps(env, ensure_ascii=False, indent=2))
    else:
        if human_summary:
            typer.echo(human_summary)
        else:
            typer.echo(json.dumps(result, ensure_ascii=False, indent=2))
        typer.echo(human_footer(metrics, int(ExitCode.SUCCESS)))


def _run(
    ctx: typer.Context,
    command_name: str,
    fn: Callable[[], CommandOutput],
) -> None:
    """Execute a command, emit envelope or human output, and exit appropriately."""
    state = _get_state(ctx)
    agent_mode = detect_agent_mode(state.force_agent, state.force_text)
    start = time.perf_counter()

    try:
        output = fn()
    except BrainError as e:
        _emit_error(
            agent_mode=agent_mode,
            command_name=command_name,
            err=e,
            start=start,
            next_actions=[],
        )
        raise typer.Exit(int(e.exit_code)) from None
    except Exception as e:
        wrapped = BrainError(
            code="UNEXPECTED",
            message=f"{type(e).__name__}: {e}",
            fix="File a bug with the trace. Try again; this may be transient.",
            exit_code=ExitCode.UNEXPECTED,
            retryable=False,
        )
        _emit_error(
            agent_mode=agent_mode,
            command_name=command_name,
            err=wrapped,
            start=start,
            next_actions=[],
        )
        raise typer.Exit(int(ExitCode.UNEXPECTED)) from e

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    metrics = Metrics(duration_ms=elapsed_ms)

    if agent_mode:
        env = success_envelope(
            command=command_name,
            result=output.result,
            next_actions=output.next_actions,
            metrics=metrics,
        )
        typer.echo(json.dumps(env, ensure_ascii=False, indent=2))
    else:
        if output.human_summary:
            typer.echo(output.human_summary)
        typer.echo(human_footer(metrics, int(ExitCode.SUCCESS), output.artifact_path))


def _emit_error(
    *,
    agent_mode: bool,
    command_name: str,
    err: BrainError,
    start: float,
    next_actions: list[NextAction],
) -> None:
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    metrics = Metrics(duration_ms=elapsed_ms)
    if agent_mode:
        env = error_envelope(
            command=command_name,
            code=err.code,
            message=err.message,
            fix=err.fix,
            next_actions=next_actions,
            metrics=metrics,
            retryable=err.retryable,
        )
        # Error envelope also goes to stdout — it's the single contract.
        typer.echo(json.dumps(env, ensure_ascii=False, indent=2))
    else:
        typer.echo(f"ERROR  {err.code}: {err.message}", err=True)
        typer.echo(f"FIX    {err.fix}", err=True)
        typer.echo(human_footer(metrics, int(err.exit_code)), err=True)


# ---------- helpers ----------


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [p.strip() for p in value.split(",") if p.strip()]


# ---------- subcommands ----------


@app.command("init")
def init_cmd(
    ctx: typer.Context,
    path: Path = typer.Argument(..., help="Where to create the vault."),
) -> None:
    """Scaffold a new vault at <path>."""
    _run(ctx, "brain init", lambda: run_init(path))


@app.command("add")
def add_cmd(
    ctx: typer.Context,
    body: str | None = typer.Argument(None, help="Event body as a positional string."),
    type_: str = typer.Option(
        "note",
        "--type",
        "-t",
        help="Event type: note | task | decision | fact | link.",
    ),
    tags: str | None = typer.Option(None, "--tags", help="Comma-separated tags."),
    link: str | None = typer.Option(None, "--link", help="Comma-separated event ids to link."),
    status: str | None = typer.Option(
        None, "--status", help="For tasks: open | done | blocked | cancelled."
    ),
    source: str = typer.Option("cli", "--source", help="Ingress channel label."),
    file: Path | None = typer.Option(None, "--file", help="Read body from a file."),
    voice: Path | None = typer.Option(None, "--voice", help="Voice file (not implemented in MVP)."),
    image: Path | None = typer.Option(None, "--image", help="Image file (not implemented in MVP)."),
    email: Path | None = typer.Option(None, "--email", help="Email file (not implemented in MVP)."),
    ts: str | None = typer.Option(None, "--ts", help="Override created_at (ISO-8601)."),
) -> None:
    """Capture a new event."""
    state = _get_state(ctx)

    def _thunk() -> CommandOutput:
        vault = find_vault(state.vault_override)
        created_at = None
        if ts is not None:
            from datetime import datetime

            raw = ts.strip()
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"
            try:
                dt = datetime.fromisoformat(raw)
            except ValueError:
                raise BrainError(
                    code="INVALID_TIMESTAMP",
                    message=f"Cannot parse --ts '{ts}'.",
                    fix="Use ISO-8601, e.g. 2026-04-24T14:00Z or 2026-04-24T14:00:00+00:00.",
                ) from None
            created_at = dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)

        return run_add(
            vault,
            body=body,
            file=file,
            voice=voice,
            image=image,
            email=email,
            type_=type_,
            tags=_split_csv(tags),
            links=_split_csv(link),
            status=status,
            source=source,
            agent=state.agent_name,
            created_at=created_at,
        )

    _run(ctx, "brain add", _thunk)


@app.command("show")
def show_cmd(
    ctx: typer.Context,
    event_id: str = typer.Argument(..., help="Event ULID (or unambiguous prefix)."),
) -> None:
    """Read an event back by id."""
    state = _get_state(ctx)
    _run(ctx, "brain show", lambda: run_show(find_vault(state.vault_override), event_id))


@app.command("reindex")
def reindex_cmd(ctx: typer.Context) -> None:
    """Rebuild the SQLite cache from the markdown vault."""
    state = _get_state(ctx)
    _run(
        ctx,
        "brain reindex",
        lambda: run_reindex(find_vault(state.vault_override), agent=state.agent_name),
    )


@app.command("timeline")
def timeline_cmd(
    ctx: typer.Context,
    since: str | None = typer.Option(None, "--since", help="Lower bound (YYYY-MM-DD or ISO)."),
    until: str | None = typer.Option(None, "--until", help="Upper bound (exclusive)."),
    last: str | None = typer.Option(None, "--last", help="Relative range like 24h, 7d, 2w, 1M."),
    type_: str | None = typer.Option(None, "--type", help="Comma-separated types to include."),
    tag: str | None = typer.Option(None, "--tag", help="Filter to events with this tag."),
    limit: int | None = typer.Option(None, "--limit", help="Cap the number of events returned."),
    format_: str = typer.Option(
        "json", "--format", help="Output format: json | md. `md` implies --write."
    ),
    write: bool = typer.Option(False, "--write", help="Write markdown artifact to renders/."),
) -> None:
    """Query events in a time range. Optionally render as a markdown artifact."""
    state = _get_state(ctx)
    fmt = format_.lower()
    if fmt not in {"json", "md"}:
        raise typer.BadParameter("format must be one of: json, md")
    should_write = write or fmt == "md"

    def _thunk() -> CommandOutput:
        vault = find_vault(state.vault_override)
        return run_timeline(
            vault,
            since=since,
            until=until,
            last=last,
            types=_split_csv(type_) or None,
            tag=tag,
            limit=limit,
            write=should_write,
        )

    _run(ctx, "brain timeline", _thunk)


if __name__ == "__main__":
    app()
