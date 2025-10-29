import generator from 'generate-password';

function generateStrongPasswordWithMax2Symbols(length = 8, maxSymbols = 2): string {
  let password: string;

  do {
    password = generator.generate({
      length,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      excludeSimilarCharacters: false,
      strict: false,
    });
  } while (countSymbols(password) > maxSymbols);

  return password;
}

function countSymbols(str: string): number {
  const match = str.match(/[^A-Za-z0-9]/g);
  return match ? match.length : 0;
}

export default generateStrongPasswordWithMax2Symbols;
