// The full history loads on demand in the app (data/fullHistory.ts); tests use it everywhere, so load it up front.
import { loadFullHistory } from './src/data/fullHistory';

await loadFullHistory();
