import { createContext, useContext, useEffect, useReducer } from "react";
import { getAllResources } from "../api";
import { logError } from "../utils/errorHandler";

// Initial state
const initialState = {
  resources: null,
  resourceIdentifier: "credit_cards",
  loading: true,
  error: null,
  user: null,
};

// Action types
const ActionTypes = {
  SET_RESOURCES: "SET_RESOURCES",
  SET_RESOURCE_IDENTIFIER: "SET_RESOURCE_IDENTIFIER",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_USER: "SET_USER",
  RESET: "RESET",
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_RESOURCES:
      return { ...state, resources: action.payload, loading: false };
    case ActionTypes.SET_RESOURCE_IDENTIFIER:
      return { ...state, resourceIdentifier: action.payload };
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload };
    case ActionTypes.RESET:
      return initialState;
    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Fetch resources on mount
  useEffect(() => {
    const fetchResources = async () => {
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
        const data = await getAllResources();
        dispatch({ type: ActionTypes.SET_RESOURCES, payload: data });
      } catch (err) {
        const errorMessage = err.message || "Error fetching resources";
        console.error(errorMessage, err);
        logError(err, { context: "fetchResources" });
        dispatch({ type: ActionTypes.SET_ERROR, payload: errorMessage });
      }
    };

    fetchResources();
  }, []);

  // Actions
  const actions = {
    setResources: (resources) =>
      dispatch({ type: ActionTypes.SET_RESOURCES, payload: resources }),
    setResourceIdentifier: (identifier) =>
      dispatch({
        type: ActionTypes.SET_RESOURCE_IDENTIFIER,
        payload: identifier,
      }),
    setLoading: (loading) =>
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
    setError: (error) =>
      dispatch({ type: ActionTypes.SET_ERROR, payload: error }),
    setUser: (user) => dispatch({ type: ActionTypes.SET_USER, payload: user }),
    reset: () => dispatch({ type: ActionTypes.RESET }),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
