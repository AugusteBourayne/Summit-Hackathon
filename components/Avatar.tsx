import { avatarGradient, initials } from "@/lib/team";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-3xl",
};

const photoAvatars = new Set<string>();

export function Avatar({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: keyof typeof sizes;
}) {
  if (photoAvatars.has(id)) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full bg-black/5 ${sizes[size]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/avatars/${id}.png`}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${avatarGradient(id)} ${sizes[size]}`}
    >
      {initials(name)}
    </div>
  );
}
