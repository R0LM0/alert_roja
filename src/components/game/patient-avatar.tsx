import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";
import { cn } from "@/lib/utils";

type PatientAvatarProps = {
  seed: string;
  name: string;
  className?: string;
};

/** Avatar generado localmente (DiceBear "Thumbs", CC0); determinista por semilla. */
export function PatientAvatar({ seed, name, className }: PatientAvatarProps) {
  const uri = createAvatar(thumbs, { seed, radius: 50 }).toDataUri();
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URI local, no hay nada que optimizar
    <img
      src={uri}
      alt={`Avatar de ${name}`}
      width={112}
      height={112}
      className={cn("size-28 rounded-full bg-surface-2 shadow-soft", className)}
    />
  );
}
