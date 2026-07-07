export const getRankForScore = (score: number) => {
  if (score <= 20) return { cat: '😭', title: 'Fruit Disaster' };
  if (score <= 60) return { cat: '😾', title: 'Beginner Slicer' };
  if (score <= 120) return { cat: '😐', title: 'Rookie Ninja' };
  if (score <= 200) return { cat: '🙂', title: 'Fruit Hunter' };
  if (score <= 350) return { cat: '😸', title: 'Slice Master' };
  if (score <= 500) return { cat: '😻', title: 'Fruit Legend' };
  if (score <= 700) return { cat: '😎', title: 'Ninja Champion' };
  return { cat: '👑', title: 'FRUIT GOD' };
};

export const getSwordSkinColors = (skin: string): { base: string; tip: string; particleType: 'sparkle' | 'ember' | 'frost' | 'star' | 'smoke' } => {
  switch (skin) {
    case 'Fire Blade': return { base: '#FF2200', tip: '#FF8800', particleType: 'ember' };
    case 'Ice Blade': return { base: '#00FFFF', tip: '#FFFFFF', particleType: 'frost' };
    case 'Galaxy Blade': return { base: '#8800FF', tip: '#FF00FF', particleType: 'star' };
    case 'Rainbow Blade': return { base: '#FF0000', tip: '#0000FF', particleType: 'sparkle' }; // Handled specially in render
    case 'Lightning Blade': return { base: '#FFFF00', tip: '#FFFFFF', particleType: 'sparkle' };
    case 'Shadow Blade': return { base: '#220033', tip: '#000000', particleType: 'smoke' };
    case 'Default Blade':
    default: return { base: '#FFFFFF', tip: '#FFDD00', particleType: 'sparkle' };
  }
};
