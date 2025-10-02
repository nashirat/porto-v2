interface PotteryCardProps {
  imageIndex: number;
  gridX: number;
  gridY: number;
  onClick?: () => void;
}

export default function PotteryCard({ imageIndex, gridX, gridY, onClick }: PotteryCardProps) {
  const imageNumber = (imageIndex % 7) + 1;

  return (
    <div
      className="pottery-card"
      onClick={onClick}
      style={{
        gridColumn: gridX + 1,
        gridRow: gridY + 1,
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        transformOrigin: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <img
        src={`/img-${imageNumber}.png`}
        alt={`Pottery item ${imageNumber}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          backgroundColor: '#f8f8f8'
        }}
        draggable={false}
      />
    </div>
  );
}