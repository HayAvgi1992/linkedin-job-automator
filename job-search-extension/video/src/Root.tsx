import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";

export const Root = () => (
  <Composition
    id="DemoVideo"
    component={DemoVideo}
    durationInFrames={1950}
    fps={30}
    width={1080}
    height={1350}
  />
);
