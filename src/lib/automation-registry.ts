"use client";

import { type AutomationExtended } from "./automation-types";

// Mantemos este array vazio pois as automações agora são carregadas como 'estado inicial' 
// no hook useData, permitindo que o usuário as veja na lista, edite ou apague.
export const AUTOMATION_REGISTRY: AutomationExtended[] = [];