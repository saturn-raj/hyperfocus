export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
