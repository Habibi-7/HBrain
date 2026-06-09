const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function buildDefaultHabits() {
  const created = new Date().toISOString();
  return [
    { id: 'speaking-to-the-camera', name: 'Speaking to the camera', icon: 'video', color: '#9eb8f0', days: [2, 6], created },
    { id: 'multi-disc', name: 'Multi-disc', icon: 'disc', color: '#b0b8f0', days: [...ALL_DAYS], created },
    { id: 'run', name: 'Run', icon: 'footprints', color: '#86c9ae', days: [0, 1, 2, 4, 5, 6], created },
    { id: 'mandarin', name: 'Mandarin', icon: 'languages', color: '#8db4f2', days: [...ALL_DAYS], created },
    { id: 'piano', name: 'Piano', icon: 'music', color: '#b0b8f0', days: [1, 3, 5, 6], created },
    { id: 'math', name: 'Math', icon: 'calculator', color: '#9eb8f0', days: [0, 2, 4, 5, 6], created },
    { id: 'coding', name: 'Coding', icon: 'code', color: '#86c9ae', days: [...ALL_DAYS], created },
    { id: 'journal', name: 'Journal', icon: 'notebook', color: '#da8598', days: [2, 4, 6], created },
    { id: 'reading', name: 'Reading', icon: 'book', color: '#9eb8f0', days: [...ALL_DAYS], created },
    { id: 'work-out', name: 'Work out', icon: 'dumbbell', color: '#da8598', days: [1, 2, 4, 5], created },
  ];
}
