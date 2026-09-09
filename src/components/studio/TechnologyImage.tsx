import Image from "next/image";
import directAirCapture from "../../../public/studio/dac.jpg";
import renewableFuels from "../../../public/studio/e-fuels.jpeg";
import carbonDioxideReduction from "../../../public/studio/carbon-dioxide-reduction.jpg";
import fischerTropsch from "../../../public/studio/fischer-tropsch.jpg";
import flexibleProcesses from "../../../public/studio/flexible-processes-large.jpg";
import type { TechnologyKind } from "./content";
import styles from "./StudioPage.module.css";

const images = {
  capture: { src: directAirCapture, position: "50% 58%" },
  fuels: { src: renewableFuels, position: "50% 50%" },
  conversion: { src: carbonDioxideReduction, position: "50% 42%" },
  synthesis: { src: fischerTropsch, position: "50% 50%" },
  flexible: { src: flexibleProcesses, position: "50% 50%" },
} satisfies Record<TechnologyKind, { src: typeof directAirCapture; position: string }>;

export function TechnologyImage({ kind, sizes, detail = false }: {
  kind: TechnologyKind;
  sizes: string;
  detail?: boolean;
}) {
  const image = images[kind];

  return (
    <Image
      src={image.src}
      alt=""
      fill
      sizes={sizes}
      placeholder={detail ? "empty" : "blur"}
      loading={detail ? "eager" : "lazy"}
      unoptimized={detail}
      className={styles.technologyImage}
      style={{ objectPosition: image.position }}
    />
  );
}
