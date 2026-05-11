export async function predictFromUri(uri: string) {
  await new Promise((r) => setTimeout(r, 800)); // fake delay

  const letters = ["அ", "ஆ", "இ", "உ", "எ"];
  const random = letters[Math.floor(Math.random() * letters.length)];

  return {
    top1: {
      label: random,
      prob: Math.random() * 0.3 + 0.7,
    },
  };
}
