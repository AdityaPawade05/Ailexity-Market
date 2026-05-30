"use client";

type ProfileStatsProps = {
  productsCount: number;
  followersCount: number;
  followingCount: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onProductsClick?: () => void;
};

export function ProfileStats({
  productsCount,
  followersCount,
  followingCount,
  onFollowersClick,
  onFollowingClick,
  onProductsClick,
}: ProfileStatsProps) {
  return (
    <div className="flex items-center gap-0">
      <button
        onClick={onProductsClick}
        className="flex-1 flex flex-col items-center py-2 hover:bg-zinc-50 rounded-lg transition-colors group"
      >
        <span className="text-lg font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
          {productsCount}
        </span>
        <span className="text-[11px] text-zinc-500 font-medium tracking-wide">
          products
        </span>
      </button>

      <div className="w-px h-8 bg-zinc-200" />

      <button
        onClick={onFollowersClick}
        className="flex-1 flex flex-col items-center py-2 hover:bg-zinc-50 rounded-lg transition-colors group"
      >
        <span className="text-lg font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
          {followersCount}
        </span>
        <span className="text-[11px] text-zinc-500 font-medium tracking-wide">
          followers
        </span>
      </button>

      <div className="w-px h-8 bg-zinc-200" />

      <button
        onClick={onFollowingClick}
        className="flex-1 flex flex-col items-center py-2 hover:bg-zinc-50 rounded-lg transition-colors group"
      >
        <span className="text-lg font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
          {followingCount}
        </span>
        <span className="text-[11px] text-zinc-500 font-medium tracking-wide">
          following
        </span>
      </button>
    </div>
  );
}
