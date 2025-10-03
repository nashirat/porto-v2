import { useEffect, useState } from 'react';
import InfiniteImageGrid from './components/InfiniteImageGrid'

function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // Wait for fonts to load before rendering
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    } else {
      // Fallback for browsers without Font Loading API
      setFontsLoaded(true);
    }
  }, []);

  // Don't render until fonts are loaded (prevents FOUT)
  if (!fontsLoaded) {
    return null;
  }

  return (
    <InfiniteImageGrid />
  )
}

export default App
