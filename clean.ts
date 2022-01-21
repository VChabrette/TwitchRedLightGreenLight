import { common } from './dictonnary';

for (const word of common) {
	const conv = word.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace('œ', 'oe');
	console.log(word, '->', conv);
}