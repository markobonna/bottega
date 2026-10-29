import type { ComponentType } from "react";
import type { AppSpec, Block, BlockType } from "@/lib/spec/schema";
import type { DbRecord } from "@/lib/records";
import Compare from "../blocks/Compare";
import Draw from "../blocks/Draw";
import Form from "../blocks/Form";
import Hear from "../blocks/Hear";
import List from "../blocks/List";
import Make from "../blocks/Make";
import Price from "../blocks/Price";
import See from "../blocks/See";
import Stat from "../blocks/Stat";
import Teach from "../blocks/teach/Teach";
import UnknownBlock from "./UnknownBlock";

export type RuntimeApp = {
  id: string;
  name: string;
  version: number;
  private: boolean;
  workshop: { id: string; name: string } | null;
};

export type BlockContext = {
  appId: string;
  version: number;
  refresh: () => void;
};

export type BlockProps = {
  block: Block;
  spec: AppSpec;
  app: RuntimeApp;
  records: DbRecord[];
  ctx: BlockContext;
};

// Every block type renders UnknownBlock until its own prompt replaces it.
export const BlockComponents: Record<BlockType, ComponentType<BlockProps>> = {
  list: List,
  form: Form,
  stat: Stat,
  see: See,
  hear: Hear,
  price: Price,
  compare: Compare,
  teach: Teach,
  draw: Draw,
  make: Make,
};
