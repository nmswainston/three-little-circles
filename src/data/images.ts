import { ImageSourcePropType } from "react-native";
import { images } from "./images.generated";
import { HiddenMickeyEntry } from "./types";

/**
 * The bundled reference photo for an entry, if it has one. The generated map
 * is built from the same content files as the entries, so an entry with an
 * image field always has a source here after `npm run content:build`.
 */
export function getEntryImageSource(entry: HiddenMickeyEntry): ImageSourcePropType | undefined {
  return entry.image ? images[entry.id] : undefined;
}
