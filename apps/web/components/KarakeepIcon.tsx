import KarakeepFull from "@/public/icons/karakeep-full.svg";
import KarakeepMark from "@/public/icons/logo-icon.svg";

export default function KarakeepLogo({
  height,
  iconOnly = false,
}: {
  height: number;
  iconOnly?: boolean;
}) {
  const Icon = iconOnly ? KarakeepMark : KarakeepFull;
  return (
    <span className="flex items-center">
      <Icon
        height={height}
        width={iconOnly ? height : undefined}
        className="fill-foreground"
      />
    </span>
  );
}
