import { heroGreen, bravePink } from '@/constants/colors';

interface LoaderProps {
  progress: number;
}

export default function Loader({ progress }: LoaderProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        backgroundColor: heroGreen[500],
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        zIndex: 9999,
        padding: '48px',
      }}
    >
      <div style={{
        color: bravePink[200],
        fontSize: '124px',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        fontWeight: 800,
        lineHeight: 1,
      }}>
        {progress}%
      </div>
    </div>
  );
}
