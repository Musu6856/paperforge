"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { useUser } from "@clerk/nextjs";
import { fetchProjects, saveProject } from "./api";
import type {
  ResearchProject,
  BackgroundStory,
  EquilibriumResult,
  GameTheoryModel,
  HotellingModel,
  LiteratureAnalysis,
  PaperSection,
  PropertyAnalysis,
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
  | { type: "SET_BACKGROUND"; payload: BackgroundStory }
  | { type: "SET_LITERATURE_ANALYSES"; payload: LiteratureAnalysis[] }
  | { type: "SET_HOTELLING_MODEL"; payload: HotellingModel }
  | { type: "SET_EQUILIBRIUM_RESULT"; payload: EquilibriumResult }
  | { type: "SET_PROPERTY_ANALYSES"; payload: PropertyAnalysis[] }
  | { type: "SET_MODEL"; payload: GameTheoryModel }
  | { type: "ADD_SECTION"; payload: PaperSection }
  | { type: "UPDATE_SECTION"; payload: { id: string; content: string } }
  | { type: "SET_REFERENCES"; payload: Reference[] }
  | { type: "SET_WIZARD_STEP"; payload: WizardStep }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "NEW_PROJECT"; payload: ResearchProject }
  | { type: "LOAD_PROJECTS"; payload: ResearchProject[] }
  | { type: "CLEAR_PROJECTS" };

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
    case "SET_BACKGROUND":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: { ...state.currentProject, background: action.payload },
      };
    case "SET_LITERATURE_ANALYSES":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          literatureAnalyses: action.payload,
        },
      };
    case "SET_HOTELLING_MODEL":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          hotellingModel: action.payload,
        },
      };
    case "SET_EQUILIBRIUM_RESULT":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          equilibriumResult: action.payload,
        },
      };
    case "SET_PROPERTY_ANALYSES":
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          propertyAnalyses: action.payload,
        },
      };
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
    case "CLEAR_PROJECTS":
      return initialState;
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
  const { isLoaded, isSignedIn } = useUser();
  const lastSavedProject = useRef<string | null>(null);
  const saveInFlight = useRef(false);
  const pendingSave = useRef<{
    project: ResearchProject;
    serialized: string;
  } | null>(null);

  const flushPendingSave = useCallback(async () => {
    if (saveInFlight.current) return;

    saveInFlight.current = true;

    try {
      while (pendingSave.current) {
        const nextSave = pendingSave.current;
        pendingSave.current = null;

        if (nextSave.serialized === lastSavedProject.current) {
          continue;
        }

        try {
          await saveProject(nextSave.project);
          lastSavedProject.current = nextSave.serialized;
        } catch (e) {
          console.error("Failed to save project", e);
          if (!pendingSave.current) {
            lastSavedProject.current = null;
          }
        }
      }
    } finally {
      saveInFlight.current = false;
    }
  }, []);

  // Load projects from Neon once Clerk knows the current auth state.
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      dispatch({ type: "CLEAR_PROJECTS" });
      lastSavedProject.current = null;
      pendingSave.current = null;
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      try {
        const projects = await fetchProjects();
        if (!cancelled) {
          dispatch({ type: "LOAD_PROJECTS", payload: projects });
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  // Persist the active project after local edits.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !state.currentProject) return;

    const serialized = JSON.stringify(state.currentProject);
    if (serialized === lastSavedProject.current) return;

    const timeoutId = window.setTimeout(() => {
      pendingSave.current = {
        project: state.currentProject!,
        serialized,
      };
      void flushPendingSave();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [flushPendingSave, isLoaded, isSignedIn, state.currentProject]);

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
