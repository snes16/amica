import { createContext } from "react";
import { ArbiusModel } from "./arbius";

const arbiusModel = new ArbiusModel();

export const ArbiusContext = createContext({ arbiusModel });