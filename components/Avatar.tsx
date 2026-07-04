import { avatarGradient, initials } from "@/lib/team";

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-28 w-28 text-3xl",
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
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ${avatarGradient(id)} ${sizes[size]}`}
    >
      {initials(name)}
    </div>
  );
}
