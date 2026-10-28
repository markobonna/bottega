import type { ComponentType } from "react";
import type { AppSpec, Block, BlockType } from "@/lib/spec/schema";
import type { DbRecord } from "@/lib/records";
import Form from "../blocks/Form";
import List from "../blocks/List";
import See from "../blocks/See";
import Stat from "../blocks/Stat";
import UnknownBlock from "./UnknownBlock";

export type RuntimeApp = { id: string; name: string; version: number };

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
  hear: UnknownBlock,
  price: UnknownBlock,
  compare: UnknownBlock,
  teach: UnknownBlock,
  draw: UnknownBlock,
  make: UnknownBlock,
};
