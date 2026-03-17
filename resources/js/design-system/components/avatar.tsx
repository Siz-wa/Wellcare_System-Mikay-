// ==========================================================================
//  WELLCARE DESIGN SYSTEM — Avatar & AvatarGroup Components
//  resources/js/design-system/components/Avatar.tsx
// ==========================================================================

import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type StatusType = 'online' | 'busy' | 'away' | 'offline';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
  status?: StatusType;
  className?: string;
}

const sizeMap: Record<AvatarSize, string> = {
  xs: 'wc-avatar-xs',
  sm: 'wc-avatar-sm',
  md: 'wc-avatar-md',
  lg: 'wc-avatar-lg',
  xl: 'wc-avatar-xl',
};

const statusMap: Record<StatusType, string> = {
  online:  'wc-status-online',
  busy:    'wc-status-busy',
  away:    'wc-status-away',
  offline: 'wc-status-offline',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = '',
  initials,
  size = 'md',
  status,
  className = '',
}) => (
  <div style={{ position: 'relative', display: 'inline-flex' }}>
    <span className={`wc-avatar ${sizeMap[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt} referrerPolicy="no-referrer" />
      ) : (
        <span aria-label={alt}>{initials}</span>
      )}
    </span>
    {status && (
      <span
        className={`wc-status-dot ${statusMap[status]}`}
        style={{ position: 'absolute', bottom: 0, right: 0 }}
        aria-label={status}
      />
    )}
  </div>
);

interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
  size?: AvatarSize;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 4,
  size = 'md',
}) => {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className="wc-avatar-group">
      {visible.map((av, i) => (
        <Avatar key={i} {...av} size={size} />
      ))}
      {overflow > 0 && (
        <span
          className={`wc-avatar ${sizeMap[size]}`}
          style={{ background: 'var(--wc-blue-100)', color: 'var(--wc-blue-700)', fontSize: 'var(--text-xs)' }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
};