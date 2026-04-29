"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";
import type {
  ResearchProject,
  GameTheoryModel,
  PaperSection,
  Reference,
  WizardStep,
} from "./types";

interface AppState {
  currentProject: ResearchProject | null;
  projects: ResearchProject[];
  wizardStep: WizardStep;
  isLoading: boolean;
}

type Action =
  | { type: "SET_PROJECT"; payload: ResearchProject }
  | { type: "UPDATE_PROJECT"; payload: Partial<ResearchProject> }
  | { type: "SET_MODEL"; payload: GameTheoryModel }
  | { type: "ADD_SECTION"; payload: PaperSection }
  | { type: "UPDATE_SECTION"; payload: { id: string; content: string } }
  | { type: "SET_REFERENCES"; payload: Reference[] }
  | { type: "SET_WIZARD_STEP"; payload: WizardStep }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "NEW_PROJECT"; payload: ResearchProject }
  | { type: "LOAD_PROJECTS"; payload: ResearchProject[] };

const initialState: AppState = {
  currentProject: null,
  projects: [],
  wizardStep: "players",
  isLoading: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_PROJECT":
      return { ...state, currentProject: action.payload };
    case "UPDATE_PROJECT":
      if (!state.currentProject) return state;
      const updated = { ...state.currentProject, ...action.payload };
      return { ...state, currentProject: updated };
    case "SET_MODEL":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: { ...state.currentProject, model: action.payload },
      };
    case "ADD_SECTION":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          sections: [...state.currentProject.sections, action.payload],
        },
      };
    case "UPDATE_SECTION":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          sections: state.currentProject.sections.map((s) =>
            s.id === action.payload.id
              ? { ...s, content: action.payload.content }
              : s
          ),
        },
      };
    case "SET_REFERENCES":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          references: action.payload,
        },
      };
    case "SET_WIZARD_STEP":
      return { ...state, wizardStep: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "NEW_PROJECT":
      return {
        ...state,
        currentProject: action.payload,
        projects: [action.payload, ...state.projects],
        wizardStep: "players",
      };
    case "LOAD_PROJECTS":
      return { ...state, projects: action.payload };
    default:
      return state;
  }
}

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load projects from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("paperforge-projects");
      if (saved) {
        dispatch({ type: "LOAD_PROJECTS", payload: JSON.parse(saved) });
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  }, []);

  // Save to localStorage when projects change
  useEffect(() => {
    try {
      localStorage.setItem(
        "paperforge-projects",
        JSON.stringify(state.projects)
      );
    } catch (e) {
      console.error("Failed to save projects", e);
    }
  }, [state.projects]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
