import { avatarGradient, initials } from "@/lib/team";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-3xl",
};

// Associe un id de clone à un fichier photo existant dans /public/avatars.
const photoAvatars: Record<string, string> = {
  "claire-dumont": "elena",
  "employe-demo": "raphael",
  "second-clone-demo": "geraud",
  "lea-fontaine": "auguste",
};

export function Avatar({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: keyof typeof sizes;
}) {
  const photo = photoAvatars[id];
  if (photo) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full ${sizes[size]}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/avatars/${photo}.png`}
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
