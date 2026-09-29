import React, { useState, useEffect } from "react";
import { X, Cloud, HardDrive, Search, Key, ChevronRight, CheckCircle, AlertCircle, Copy, Check, Lock, LogOut, User, Folder, RefreshCw, Trash2, Pencil } from "lucide-react";
import { saveCloudProject, getCloudProjectsByCreator, getCloudProjectByCode, authenticateCreator, deleteCloudProject, renameCloudProject, CloudProject } from "../lib/firebase";
import { trackProjectSave } from "../lib/analytics";

interface ProjectStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "save" | "load";
  onSaveLocal: () => void;
  onLoadLocal: () => void;
  onLoadProjectData: (projectData: any, cloudInfo?: { id: string; code: string; name: string }) => void;
  scenes: any[];
  activeSceneId: string;
  activeCharacterId: string;
  activeProjectId: string | null;
  activeProjectCode: string | null;
  loadedProjectName: string;
  onUpdateActiveProjectInfo: (id: string, code: string, name: string) => void;
}

export const ProjectStorageModal: React.FC<ProjectStorageModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSaveLocal,
  onLoadLocal,
  onLoadProjectData,
  scenes,
  activeSceneId,
  activeCharacterId,
  activeProjectId,
  activeProjectCode,
  loadedProjectName,
  onUpdateActiveProjectInfo
}) => {
  // Navigation tabs for Cloud vs Local
  const [subTab, setSubTab] = useState<"choose" | "cloud" | "local">("choose");

  // User Authentication states
  const [loggedInCreator, setLoggedInCreator] = useState<string>("");
  const [loggedInPasscode, setLoggedInPasscode] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  // Input states for Login Form
  const [inputName, setInputName] = useState("");
  const [inputPass, setInputPass] = useState("");

  // Save modes: "update-or-new" (if they have an active project loaded) or "new-only"
  const [saveActionType, setSaveActionType] = useState<"ask" | "new">("ask");

  // Save states (When Authenticated)
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedProjectCode, setSavedProjectCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Load states (When Authenticated)
  const [userProjects, setUserProjects] = useState<CloudProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectNameInput, setEditingProjectNameInput] = useState<string>("");

  // Sharing code search state
  const [friendCode, setFriendCode] = useState("");
  const [searchingFriend, setSearchingFriend] = useState(false);
  const [friendProject, setFriendProject] = useState<CloudProject | null>(null);
  const [friendError, setFriendError] = useState("");

  // Load session from localStorage on mount/open
  useEffect(() => {
    if (isOpen) {
      setSubTab("choose");
      setSaveSuccess(false);
      setProjectName("");
      setFriendCode("");
      setFriendProject(null);
      setFriendError("");
      setAuthError("");

      const savedCreator = localStorage.getItem("codejr_cloud_creator") || "";
      const savedPass = localStorage.getItem("codejr_cloud_passcode") || "";

      setLoggedInCreator(savedCreator);
      setLoggedInPasscode(savedPass);
      setInputName(savedCreator);
      setInputPass(savedPass);

      // Reset save action type
      if (activeProjectId) {
        setSaveActionType("ask");
      } else {
        setSaveActionType("new");
      }

      if (savedCreator && savedPass) {
        // Fetch user's projects immediately
        loadUserProjects(savedCreator);
      }
    }
  }, [isOpen, activeProjectId]);

  // Sync keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const loadUserProjects = async (creator: string) => {
    setLoadingProjects(true);
    try {
      const list = await getCloudProjectsByCreator(creator);
      setUserProjects(list);
    } catch (err) {
      console.error("Error loading user projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = inputName.trim();
    const cleanPass = inputPass.trim();

    if (!cleanName || !cleanPass) {
      setAuthError("Please fill in both your name and secret code!");
      return;
    }

    setIsAuthenticating(true);
    setAuthError("");

    try {
      const authRes = await authenticateCreator(cleanName, cleanPass);
      if (!authRes.success) {
        if (authRes.error === "WRONG_PASSCODE") {
          setAuthError(
            "Oops! This name is already taken with a different secret code. 🔐 If you forgot your code, that's totally fine! Just type a slightly different name (like Leo K. or Leo2) and you can start creating new projects!"
          );
        } else {
          setAuthError("Error connecting to the cloud. Please try again.");
        }
        setIsAuthenticating(false);
        return;
      }

      // If checks pass, log them in and fetch user projects
      const list = await getCloudProjectsByCreator(cleanName);
      localStorage.setItem("codejr_cloud_creator", cleanName);
      localStorage.setItem("codejr_cloud_passcode", cleanPass);
      setLoggedInCreator(cleanName);
      setLoggedInPasscode(cleanPass);
      setUserProjects(list);
    } catch (err) {
      console.error(err);
      setAuthError("Error connecting to the cloud. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("codejr_cloud_creator");
    localStorage.removeItem("codejr_cloud_passcode");
    setLoggedInCreator("");
    setLoggedInPasscode("");
    setInputName("");
    setInputPass("");
    setUserProjects([]);
    onUpdateActiveProjectInfo("", "", "");
  };

  const handleCloudSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveActionType === "new" && !projectName.trim()) {
      alert("Please enter a name for your project!");
      return;
    }

    setSaving(true);
    setAuthError("");

    const projectData = {
      format: "scratchjr-web",
      version: 1,
      scenes,
      activeSceneId,
      activeCharacterId
    };

    // Determine target identifiers
    const isUpdating = saveActionType === "ask" && activeProjectId;
    const finalProjectName = isUpdating ? loadedProjectName : projectName.trim();
    const targetId = isUpdating ? activeProjectId : undefined;
    const targetCode = isUpdating ? activeProjectCode || undefined : undefined;

    try {
      const res = await saveCloudProject({
        id: targetId,
        projectName: finalProjectName,
        creatorName: loggedInCreator,
        passcode: loggedInPasscode,
        projectCode: targetCode,
        scenesData: JSON.stringify(projectData)
      });

      if (res.success) {
        trackProjectSave();
        setSavedProjectCode(res.projectCode);
        setSaveSuccess(true);
        setProjectName("");
        
        // Notify parent application of the project context
        onUpdateActiveProjectInfo(res.id, res.projectCode, finalProjectName);

        // Reload project list to include the newly saved project
        loadUserProjects(loggedInCreator);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError("Error saving to the cloud. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadConfirm = (proj: CloudProject) => {
    try {
      const data = JSON.parse(proj.scenesData);
      onLoadProjectData(data, { id: proj.id!, code: proj.projectCode, name: proj.projectName });
      onClose();
    } catch (err) {
      alert("Error loading the project file.");
    }
  };

  const handleDeleteConfirm = async (proj: CloudProject) => {
    if (!proj.id) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${proj.projectName}" from the cloud? This cannot be undone!`);
    if (!confirmed) return;

    try {
      const success = await deleteCloudProject(proj.id);
      if (success) {
        // If they deleted the active project, clear the active project info
        if (proj.id === activeProjectId) {
          onUpdateActiveProjectInfo("", "", "");
        }
        // Refresh project list
        loadUserProjects(loggedInCreator);
      } else {
        alert("Could not delete project. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while deleting.");
    }
  };

  const handleRenameConfirm = (proj: CloudProject) => {
    if (!proj.id) return;
    setEditingProjectId(proj.id);
    setEditingProjectNameInput(proj.projectName);
  };

  const handleSaveInlineRename = async (proj: CloudProject) => {
    if (!proj.id) return;
    const cleanName = editingProjectNameInput.trim();
    if (!cleanName) {
      alert("Project name cannot be empty!");
      return;
    }

    try {
      const success = await renameCloudProject(proj.id, cleanName);
      if (success) {
        // If they renamed the active project, update active project context in parent
        if (proj.id === activeProjectId) {
          onUpdateActiveProjectInfo(proj.id, proj.projectCode, cleanName);
        }
        setEditingProjectId(null);
        // Refresh project list
        loadUserProjects(loggedInCreator);
      } else {
        alert("Could not rename project. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while renaming.");
    }
  };

  const handleFriendCodeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = friendCode.trim();
    if (!code) return;

    setSearchingFriend(true);
    setFriendError("");
    setFriendProject(null);

    try {
      const proj = await getCloudProjectByCode(code);
      if (proj) {
        setFriendProject(proj);
      } else {
        setFriendError("No project found with this code. Check the code you got from your friend.");
      }
    } catch (err) {
      console.error(err);
      setFriendError("Error searching for the project.");
    } finally {
      setSearchingFriend(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(savedProjectCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans text-left" dir="ltr">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border-4 border-amber-400 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-6 py-4 flex items-center justify-between text-white relative">
          <h2 className="text-2xl font-black text-center flex-1 drop-shadow-sm">
            {mode === "save" ? "Save Project" : "Load Project"}
          </h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-amber-50/30">
          {subTab === "choose" && (
            <div className="flex flex-col items-center justify-center py-6 gap-6">
              <p className="text-lg font-bold text-amber-900 text-center">
                {mode === "save" 
                  ? "Where would you like to save your lovely project?" 
                  : "Where would you like to open your project from?"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Save/Load Locally Card */}
                <button
                  onClick={() => {
                    if (mode === "save") {
                      onSaveLocal();
                      onClose();
                    } else {
                      setSubTab("local");
                    }
                  }}
                  className="bg-white hover:bg-orange-50/50 border-4 border-orange-200 hover:border-orange-400 rounded-3xl p-6 flex flex-col items-center text-center gap-3 transition-all hover:scale-105 active:scale-95 group shadow-sm"
                >
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500 group-hover:bg-orange-200 transition-colors">
                    <HardDrive className="w-10 h-10" />
                  </div>
                  <span className="text-xl font-extrabold text-orange-800">
                    {mode === "save" ? "Save on Computer" : "Open from Computer"}
                  </span>
                  <span className="text-sm text-orange-600/80">
                    {mode === "save" 
                      ? "Download the project file (.sjr) straight to your computer" 
                      : "Choose a project file (.sjr) saved on your computer"}
                  </span>
                </button>

                {/* Save/Load from Cloud Card */}
                <button
                  onClick={() => setSubTab("cloud")}
                  className="bg-white hover:bg-amber-50/50 border-4 border-amber-200 hover:border-amber-400 rounded-3xl p-6 flex flex-col items-center text-center gap-3 transition-all hover:scale-105 active:scale-95 group shadow-sm"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-500 group-hover:bg-amber-200 transition-colors">
                    <Cloud className="w-10 h-10" />
                  </div>
                  <span className="text-xl font-extrabold text-amber-800">
                    {mode === "save" ? "Save in the Cloud ☁️" : "Open from the Cloud ☁️"}
                  </span>
                  <span className="text-sm text-amber-600/80">
                    {mode === "save" 
                      ? "Save safely in your private cloud account" 
                      : "Log in and open any of your previously saved cloud projects"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* LOCAL FILE LOADING STAGE */}
          {subTab === "local" && mode === "load" && (
            <div className="flex flex-col items-center py-6 gap-4">
              <HardDrive className="w-16 h-16 text-orange-500 animate-bounce" />
              <p className="text-lg font-bold text-gray-700 text-center">
                Select a project file from your computer to continue
              </p>
              <button
                onClick={() => {
                  onLoadLocal();
                  onClose();
                }}
                className="bg-gradient-to-r from-orange-400 to-amber-400 text-white font-extrabold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-all"
              >
                Click here to choose file (.sjr)
              </button>
              <button 
                onClick={() => setSubTab("choose")} 
                className="text-amber-600 hover:text-amber-800 font-bold mt-4 underline text-sm"
              >
                Go Back
              </button>
            </div>
          )}

          {/* CLOUD STAGE (Requires Cloud Authentication) */}
          {subTab === "cloud" && (
            <div>
              {!loggedInCreator ? (
                /* LOGIN / SIGNUP SCREEN */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="bg-amber-100/60 p-4 rounded-2xl border border-amber-200 text-center">
                    <p className="text-sm font-bold text-amber-900 leading-relaxed">
                      Welcome to the cloud! ☁️ Choose a username and a secret code to save and open your projects safely from any computer.
                    </p>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-amber-950 mb-1">Your Name 🧑‍🎨</label>
                    <input
                      type="text"
                      required
                      placeholder="Type your name (e.g., Leo Smith)"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      className="w-full bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl px-4 py-3 outline-none text-base text-gray-800 placeholder-gray-400 text-left font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-bold text-amber-950 mb-1">Secret Code 🔑</label>
                    <input
                      type="password"
                      required
                      maxLength={10}
                      placeholder="Type a secret passcode (e.g., 4 numbers)"
                      value={inputPass}
                      onChange={(e) => setInputPass(e.target.value)}
                      className="w-full bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl px-4 py-3 outline-none text-base text-gray-800 placeholder-gray-400 text-left font-semibold"
                    />
                    <span className="text-xs text-amber-700/80 block mt-1 font-semibold">
                      * Keep your code secret! You will need it to load your account next time.
                    </span>
                  </div>

                  {authError && (
                    <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold border border-red-200 leading-relaxed">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSubTab("choose")}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-5 py-3 rounded-xl transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3 px-6 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                      {isAuthenticating ? "Connecting..." : "Connect to Cloud 🌟"}
                    </button>
                  </div>
                </form>
              ) : (
                /* AUTHENTICATED ACTIONS SCREEN */
                <div className="space-y-4">
                  {/* User Profile Header */}
                  <div className="bg-amber-100/50 px-4 py-3 rounded-2xl border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs text-amber-700 font-bold">Connected to cloud as:</p>
                        <p className="text-base font-black text-amber-950">{loggedInCreator}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-bold hover:bg-red-50 px-3 py-2 rounded-xl border border-red-200 transition-colors"
                      title="Log Out"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Switch User</span>
                    </button>
                  </div>

                  {/* SAVE MODE */}
                  {mode === "save" && (
                    <div>
                      {!saveSuccess ? (
                        <div className="space-y-4">
                          {saveActionType === "ask" && activeProjectId ? (
                            /* ASK USER WHETHER TO UPDATE EXISTING OR SAVE NEW */
                            <div className="space-y-4">
                              <div className="bg-amber-100/40 p-4 rounded-2xl border border-amber-200 text-center">
                                <p className="text-base font-bold text-amber-950">
                                  You are editing: <span className="font-black text-orange-600">"{loadedProjectName}"</span>
                                </p>
                                <p className="text-sm text-amber-800 mt-1">What would you like to do?</p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Option A: Update existing document */}
                                <button
                                  type="button"
                                  onClick={handleCloudSaveSubmit}
                                  disabled={saving}
                                  className="bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-orange-600 text-white font-black p-5 rounded-2xl shadow flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-8 h-8 ${saving ? 'animate-spin' : ''}`} />
                                  <span className="text-lg">Update Existing</span>
                                  <span className="text-xs font-normal text-orange-100">Saves directly over the same project file</span>
                                </button>

                                {/* Option B: Save as new */}
                                <button
                                  type="button"
                                  onClick={() => setSaveActionType("new")}
                                  className="bg-white hover:bg-amber-50 border-4 border-amber-100 hover:border-amber-400 text-amber-900 font-black p-5 rounded-2xl shadow flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                                >
                                  <Cloud className="w-8 h-8 text-amber-500" />
                                  <span className="text-lg">Save as New Project</span>
                                  <span className="text-xs font-normal text-amber-600">Creates a brand new copy with a different name</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* SAVE AS NEW FORM */
                            <form onSubmit={handleCloudSaveSubmit} className="space-y-4">
                              <div>
                                <label className="block text-base font-bold text-amber-950 mb-1">Project Name 🚀</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g., My Bouncing Panda"
                                  value={projectName}
                                  onChange={(e) => setProjectName(e.target.value)}
                                  className="w-full bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl px-4 py-3 outline-none text-base text-gray-800 placeholder-gray-400 text-left font-semibold"
                                />
                              </div>

                              {authError && (
                                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-semibold border border-red-200">
                                  <AlertCircle className="w-5 h-5 shrink-0" />
                                  <span>{authError}</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-3 pt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activeProjectId) {
                                      setSaveActionType("ask");
                                    } else {
                                      setSubTab("choose");
                                    }
                                  }}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-5 py-3 rounded-xl transition-all"
                                >
                                  Back
                                </button>
                                <button
                                  type="submit"
                                  disabled={saving}
                                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3 px-6 rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                >
                                  {saving ? "Saving..." : "Save to Cloud ☁️"}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-4 text-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                            <CheckCircle className="w-12 h-12" />
                          </div>
                          <h3 className="text-2xl font-black text-green-800">Saved Successfully! 🎉</h3>
                          <p className="text-base text-gray-600 max-w-sm">
                            Your project is now safely stored in your cloud and available from any computer.
                          </p>

                          <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl px-6 py-3 flex flex-col items-center gap-1 shadow-inner">
                            <span className="text-xs font-black text-amber-700 uppercase tracking-wider">Share Code for Friends</span>
                            <span className="text-3xl font-black text-amber-950 tracking-wider font-mono">{savedProjectCode}</span>
                            <button
                              onClick={handleCopyCode}
                              className="flex items-center gap-1 text-xs text-amber-800 font-bold hover:text-amber-900 mt-1 bg-white px-3 py-1 rounded-full shadow-sm border border-amber-200"
                            >
                              {copiedCode ? (
                                <>
                                  <Check className="w-3 text-green-600" />
                                  <span className="text-green-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3" />
                                  <span>Copy Share Code</span>
                                </>
                              )}
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setSaveSuccess(false);
                              if (activeProjectId) {
                                setSaveActionType("ask");
                              } else {
                                setSaveActionType("new");
                              }
                            }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-2 rounded-xl text-sm"
                          >
                            Save Another Project
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LOAD MODE */}
                  {mode === "load" && (
                    <div className="space-y-4">
                      {/* Section: My saved projects */}
                      <div className="bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-inner">
                        <h4 className="text-base font-black text-amber-950 mb-3 flex items-center gap-2">
                          <Folder className="w-5 h-5 text-amber-500" />
                          <span>My Saved Cloud Projects:</span>
                        </h4>

                        {loadingProjects ? (
                          <div className="text-center py-6 text-amber-700 font-semibold animate-pulse">Loading your projects...</div>
                        ) : userProjects.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pl-1">
                            {userProjects.map((proj) => {
                              const isCurrentActive = proj.id === activeProjectId;
                              return (
                                <div
                                  key={proj.id}
                                  className={`w-full border-2 rounded-xl p-3 flex items-center justify-between transition-all font-semibold ${
                                    isCurrentActive 
                                      ? "bg-orange-50/50 border-orange-300" 
                                      : "bg-amber-50/40 border-amber-100 hover:border-amber-200"
                                  }`}
                                >
                                  {/* Left section: clickable load button or inline editor */}
                                  {editingProjectId === proj.id ? (
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSaveInlineRename(proj);
                                      }}
                                      className="flex-1 flex items-center gap-1.5 pr-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="text"
                                        value={editingProjectNameInput}
                                        onChange={(e) => setEditingProjectNameInput(e.target.value)}
                                        className="border-2 border-amber-400 bg-white rounded-lg px-2 py-1 text-sm text-amber-950 font-bold focus:outline-hidden max-w-[150px] w-full"
                                        placeholder="New name..."
                                        autoFocus
                                      />
                                      <button
                                        type="submit"
                                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-xs shrink-0"
                                        title="Save name"
                                      >
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingProjectId(null)}
                                        className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center justify-center shadow-xs shrink-0"
                                        title="Cancel"
                                      >
                                        <X className="w-3.5 h-3.5 stroke-[3]" />
                                      </button>
                                    </form>
                                  ) : (
                                    <button
                                      onClick={() => handleLoadConfirm(proj)}
                                      className="flex-1 text-left flex flex-col group pr-2"
                                    >
                                      <p className={`text-base font-extrabold group-hover:text-amber-600 transition-colors ${
                                        isCurrentActive ? "text-orange-950" : "text-amber-950"
                                      }`}>
                                        {proj.projectName}
                                        {isCurrentActive && (
                                          <span className="ml-2 text-xs bg-orange-400 text-white px-2 py-0.5 rounded-full font-bold">Active Now</span>
                                        )}
                                      </p>
                                      <p className="text-xs text-amber-600/70">Share Code: {proj.projectCode}</p>
                                    </button>
                                  )}

                                  {/* Right section: Open, Rename, and Delete actions */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleLoadConfirm(proj)}
                                      className="text-xs bg-amber-400 hover:bg-amber-500 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                                    >
                                      <span>Open</span>
                                      <ChevronRight className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRenameConfirm(proj);
                                      }}
                                      className="p-1.5 bg-amber-100 hover:bg-amber-500 hover:text-white text-amber-800 rounded-lg transition-colors"
                                      title="Rename project"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteConfirm(proj);
                                      }}
                                      className="p-1.5 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-lg transition-colors"
                                      title="Delete project from cloud"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-400 text-sm font-semibold">
                            You haven't saved any projects in the cloud yet!
                          </div>
                        )}
                      </div>

                      {/* Section: Load a friend's project by share code */}
                      <div className="border-t border-amber-200 pt-4">
                        <form onSubmit={handleFriendCodeSearch} className="bg-amber-100/30 p-4 rounded-2xl border border-amber-200 space-y-3">
                          <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                            <Search className="w-4 h-4 text-amber-500" />
                            <span>Want to open a friend's project?</span>
                          </h4>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Type your friend's 4-character Share Code"
                              value={friendCode}
                              onChange={(e) => setFriendCode(e.target.value)}
                              className="w-full bg-white border-2 border-amber-200 focus:border-amber-400 rounded-xl px-4 py-2.5 pr-12 outline-none text-sm text-gray-800 placeholder-gray-400 text-left font-semibold"
                            />
                            <button
                              type="submit"
                              disabled={searchingFriend}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-amber-400 text-white hover:bg-amber-500 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                            >
                              <Search className="w-4 h-4" />
                            </button>
                          </div>

                          {friendError && (
                            <p className="text-xs text-red-600 font-semibold">{friendError}</p>
                          )}

                          {friendProject && (
                            <div className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-black text-amber-950">{friendProject.projectName}</p>
                                <p className="text-xs text-gray-400">Creator: {friendProject.creatorName}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleLoadConfirm(friendProject)}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:scale-105 transition-all"
                              >
                                Open Friend's Project
                              </button>
                            </div>
                          )}
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSubTab("choose")}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-5 py-3 rounded-xl transition-all"
                    >
                      Back to Options
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
