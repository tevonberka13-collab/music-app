const ideaCategories = ["Hook", "Verse", "Song Idea"];
const storageKey = "musicIdeas";
let ideas = [];
let editingIdeaIndex = null;
let activeCategoryFilter = "All";
let activeFavoritesOnly = false;
let activeSortOrder = "newest";
let visibleIdeasExportIsOpen = false;
let currentAuthSession = null;
let currentAuthUser = null;
let authIsBusy = false;
let signedOutIdeasSnapshot = [];
let storageNoticeMessage =
  "Ideas are currently saved only in this browser. Export a backup if you want a copy outside this device.";
let storageNoticeIsWarning = false;

const supabaseConfig = window.MUSIC_APP_SUPABASE_CONFIG || {};
const supabaseClient = window.musicAppSupabase;
const supabaseIdeasTableName =
  typeof supabaseConfig.ideasTable === "string" && supabaseConfig.ideasTable.trim() !== ""
    ? supabaseConfig.ideasTable.trim()
    : "ideas";
const supabaseIdeaSelectColumns = "id,user_id,title,category,lyric,pinned,created_at";
const songTitleInput = document.getElementById("songTitle");
const ideaCategorySelect = document.getElementById("ideaCategory");
const lyricIdeaInput = document.getElementById("lyricIdea");
const ideaSearchInput = document.getElementById("ideaSearch");
const authEmailInput = document.getElementById("authEmail");
const authPasswordInput = document.getElementById("authPassword");
const signUpButton = document.getElementById("signUpButton");
const logInButton = document.getElementById("logInButton");
const logOutButton = document.getElementById("logOutButton");
const authStatus = document.getElementById("authStatus");
const authSessionBadge = document.getElementById("authSessionBadge");
const saveIdeaButton = document.getElementById("saveIdeaButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const importIdeasInput = document.getElementById("importIdeasInput");
const composerStatus = document.getElementById("composerStatus");
const ideaCount = document.getElementById("ideaCount");
const categoryFilters = document.getElementById("categoryFilters");
const favoritesOnlyButton = document.getElementById("favoritesOnlyButton");
const ideasSortOrderSelect = document.getElementById("ideasSortOrder");
const exportVisibleIdeasButton = document.getElementById("exportVisibleIdeasButton");
const visibleIdeasExportPanel = document.getElementById("visibleIdeasExportPanel");
const visibleIdeasExportOutput = document.getElementById("visibleIdeasExportOutput");
const visibleIdeasExportStatus = document.getElementById("visibleIdeasExportStatus");
const totalIdeasStat = document.getElementById("totalIdeasStat");
const pinnedIdeasStat = document.getElementById("pinnedIdeasStat");
const hookIdeasStat = document.getElementById("hookIdeasStat");
const verseIdeasStat = document.getElementById("verseIdeasStat");
const songIdeaIdeasStat = document.getElementById("songIdeaIdeasStat");
const storageNotice = document.getElementById("storageNotice");

function isSupabaseReady() {
  return Boolean(supabaseClient);
}

function isUsingSupabaseIdeas() {
  return isSupabaseReady() && currentAuthUser !== null;
}

function getAuthIdentityLabel(user) {
  if (!user) {
    return "Signed out";
  }

  return user.email || "Signed in";
}

function setAuthBusyState(isBusy) {
  authIsBusy = isBusy;

  authEmailInput.disabled = isBusy;
  authPasswordInput.disabled = isBusy;
  signUpButton.disabled = isBusy || !isSupabaseReady() || currentAuthUser !== null;
  logInButton.disabled = isBusy || !isSupabaseReady() || currentAuthUser !== null;
  logOutButton.disabled = isBusy || !isSupabaseReady() || currentAuthUser === null;
}

function updateAuthUi() {
  if (!isSupabaseReady()) {
    authSessionBadge.textContent = "Supabase not ready";
    authStatus.textContent =
      "Supabase is not configured yet. Add your project URL and publishable key in supabase-config.js first.";
    setAuthBusyState(false);
    return;
  }

  if (currentAuthUser) {
    authSessionBadge.textContent = "Signed in";
    authStatus.textContent =
      "Signed in as " +
      getAuthIdentityLabel(currentAuthUser) +
      ". Your ideas load from Supabase for this account.";
    authEmailInput.value = currentAuthUser.email || authEmailInput.value;
    authPasswordInput.value = "";
  } else {
    authSessionBadge.textContent = "Signed out";
    authStatus.textContent =
      "Sign up or log in with email and password. When signed out, your ideas stay local in this browser.";
  }

  setAuthBusyState(authIsBusy);
}

function updateAuthState(session) {
  currentAuthSession = session || null;
  currentAuthUser = session && session.user ? session.user : null;
  updateAuthUi();
  updateStorageNotice();
}

function getAuthCredentials() {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    alert("Enter both email and password.");
    return null;
  }

  return {
    email: email,
    password: password
  };
}

async function signUpWithSupabase() {
  const credentials = getAuthCredentials();

  if (!credentials || !isSupabaseReady()) {
    return;
  }

  setAuthBusyState(true);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      throw error;
    }

    updateAuthState(data.session || currentAuthSession);
    authPasswordInput.value = "";

    if (data.session) {
      authStatus.textContent =
        "Your account was created and you are signed in as " + getAuthIdentityLabel(data.user) + ".";
    } else {
      authStatus.textContent =
        "Your account was created. Check your email for the confirmation link, then log in here.";
    }
  } catch (error) {
    authStatus.textContent = error.message || "We could not sign you up right now.";
    alert(authStatus.textContent);
  } finally {
    setAuthBusyState(false);
  }
}

async function logInWithSupabase() {
  const credentials = getAuthCredentials();

  if (!credentials || !isSupabaseReady()) {
    return;
  }

  setAuthBusyState(true);

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      throw error;
    }

    updateAuthState(data.session || null);
    authPasswordInput.value = "";
    authStatus.textContent = "You are now logged in as " + getAuthIdentityLabel(data.user) + ".";
  } catch (error) {
    authStatus.textContent = error.message || "We could not log you in right now.";
    alert(authStatus.textContent);
  } finally {
    setAuthBusyState(false);
  }
}

async function logOutOfSupabase() {
  if (!isSupabaseReady() || !currentAuthUser) {
    return;
  }

  setAuthBusyState(true);

  try {
    const localIdeasBackup = JSON.stringify(signedOutIdeasSnapshot);
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    updateAuthState(null);
    localStorage.setItem(storageKey, localIdeasBackup);
    restoreSignedOutIdeas();
    authStatus.textContent = "You are logged out. Your local browser ideas are shown here again.";
  } catch (error) {
    authStatus.textContent = error.message || "We could not log you out right now.";
    alert(authStatus.textContent);
  } finally {
    setAuthBusyState(false);
  }
}

async function initializeAuth() {
  if (!isSupabaseReady()) {
    updateAuthUi();
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    authStatus.textContent = error.message || "We could not read your auth session.";
  }

  updateAuthState(data && data.session ? data.session : null);

  if (currentAuthUser) {
    await loadIdeasFromSupabase(false);
  }

  supabaseClient.auth.onAuthStateChange(function(event, session) {
    window.setTimeout(function() {
      handleAuthStateChange(event, session || null);
    }, 0);
  });
}

function normalizeIdeasCollection(rawIdeas) {
  return rawIdeas
    .map(normalizeIdea)
    .filter(function(idea) {
      return idea !== null;
    });
}

function copyIdeasSnapshot(nextIdeas) {
  return normalizeIdeasCollection(nextIdeas || []);
}

function updateSignedOutIdeasSnapshot(nextIdeas) {
  signedOutIdeasSnapshot = copyIdeasSnapshot(nextIdeas);
}

function restoreSignedOutIdeas() {
  ideas = copyIdeasSnapshot(signedOutIdeasSnapshot);
  resetForm();
  renderIdeas();
}

async function handleAuthStateChange(event, session) {
  updateAuthState(session);

  if (session && session.user) {
    authStatus.textContent = "Signed in as " + getAuthIdentityLabel(session.user) + ". Loading your ideas from Supabase.";
    await loadIdeasFromSupabase(event !== "INITIAL_SESSION");
    return;
  }

  restoreSignedOutIdeas();
  authStatus.textContent = "You are signed out. Your local browser ideas are shown here.";
}

function loadIdeasFromLocalStorage() {
  const savedIdeas = localStorage.getItem(storageKey);

  if (!savedIdeas) {
    return [];
  }

  try {
    const parsedIdeas = JSON.parse(savedIdeas);

    if (!Array.isArray(parsedIdeas)) {
      throw new Error("Saved ideas are not in the expected format.");
    }

    return parsedIdeas;
  } catch (error) {
    storageNoticeMessage =
      "We could not read your previously saved ideas in this browser, so the app started with a clean slate. Export backups when you can.";
    storageNoticeIsWarning = true;
    console.error("Unable to read saved ideas from local storage.", error);
    return [];
  }
}

function formatIdeaCategory(category) {
  if (ideaCategories.indexOf(category) === -1) {
    return "No category";
  }

  return category;
}

function formatIdeaTimestamp(createdAt) {
  return "Created " + describeIdeaTimestamp(createdAt);
}

function describeIdeaTimestamp(createdAt) {
  if (!createdAt) {
    return "before timestamps were added";
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return "date unavailable";
  }

  return createdDate.toLocaleString();
}

function matchesIdeaSearch(idea, searchQuery) {
  if (!searchQuery) {
    return true;
  }

  const title = (idea.title || "").toLowerCase();
  const lyric = (idea.lyric || "").toLowerCase();

  return title.indexOf(searchQuery) !== -1 || lyric.indexOf(searchQuery) !== -1;
}

function matchesIdeaCategory(idea, categoryFilter) {
  if (categoryFilter === "All") {
    return true;
  }

  return idea.category === categoryFilter;
}

function matchesFavoritesFilter(idea) {
  if (!activeFavoritesOnly) {
    return true;
  }

  return idea.pinned === true;
}

function updateCategoryFilterButtons() {
  Array.from(categoryFilters.querySelectorAll("[data-category-filter]")).forEach(function(button) {
    button.classList.toggle("is-active", button.dataset.categoryFilter === activeCategoryFilter);
  });
}

function setActiveCategoryFilter(categoryFilter) {
  activeCategoryFilter = categoryFilter;
  updateCategoryFilterButtons();
}

function updateFavoritesOnlyButton() {
  favoritesOnlyButton.classList.toggle("is-active", activeFavoritesOnly);
  favoritesOnlyButton.setAttribute("aria-pressed", activeFavoritesOnly ? "true" : "false");
}

function toggleFavoritesOnlyFilter() {
  activeFavoritesOnly = !activeFavoritesOnly;
  updateFavoritesOnlyButton();
}

function normalizeIdea(idea) {
  if (!idea || typeof idea !== "object") {
    return null;
  }

  const id = typeof idea.id === "string" || typeof idea.id === "number" ? idea.id : null;
  const userId =
    typeof idea.userId === "string"
      ? idea.userId
      : typeof idea.user_id === "string"
        ? idea.user_id
        : null;
  const title = typeof idea.title === "string" ? idea.title.trim() : "";
  const lyric = typeof idea.lyric === "string" ? idea.lyric.trim() : "";
  const category = typeof idea.category === "string" ? idea.category : "";
  const pinned = idea.pinned === true;
  const rawCreatedAt =
    typeof idea.createdAt === "string"
      ? idea.createdAt
      : typeof idea.created_at === "string"
        ? idea.created_at
        : null;
  const createdAt =
    typeof rawCreatedAt === "string" && !Number.isNaN(new Date(rawCreatedAt).getTime())
      ? rawCreatedAt
      : new Date().toISOString();

  if (!title || !lyric) {
    return null;
  }

  return {
    id: id,
    userId: userId,
    title: title,
    category: category,
    lyric: lyric,
    createdAt: createdAt,
    pinned: pinned
  };
}

function parseImportedIdeas(importedContent) {
  const parsedContent = JSON.parse(importedContent);
  const rawIdeas = Array.isArray(parsedContent)
    ? parsedContent
    : parsedContent && Array.isArray(parsedContent.ideas)
      ? parsedContent.ideas
      : null;

  if (!rawIdeas) {
    throw new Error("That file does not look like a Music App backup.");
  }

  const normalizedIdeas = normalizeIdeasCollection(rawIdeas);

  if (normalizedIdeas.length === 0) {
    throw new Error("That backup did not contain any valid ideas to import.");
  }

  return normalizedIdeas;
}

function saveIdeas() {
  if (isUsingSupabaseIdeas()) {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(ideas));
  updateSignedOutIdeasSnapshot(ideas);
}

function createSupabaseIdeaPayload(idea) {
  return {
    user_id: currentAuthUser.id,
    title: idea.title,
    category: idea.category,
    lyric: idea.lyric,
    pinned: idea.pinned === true,
    created_at: idea.createdAt
  };
}

function getSupabaseIdeaErrorMessage(actionLabel, error) {
  const baseMessage = "We could not " + actionLabel + " in Supabase right now.";

  if (!error || !error.message) {
    return baseMessage;
  }

  return (
    baseMessage +
    " Make sure your \"" +
    supabaseIdeasTableName +
    "\" table includes id, user_id, title, category, lyric, pinned, and created_at."
  );
}

async function loadIdeasFromSupabase(showAlertOnError) {
  if (!isUsingSupabaseIdeas()) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from(supabaseIdeasTableName)
      .select(supabaseIdeaSelectColumns)
      .eq("user_id", currentAuthUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    ideas = normalizeIdeasCollection(data || []);
    resetForm();
    renderIdeas();
    authStatus.textContent =
      "Signed in as " + getAuthIdentityLabel(currentAuthUser) + ". Your ideas are now loading from Supabase.";
  } catch (error) {
    ideas = [];
    resetForm();
    renderIdeas();
    authStatus.textContent = getSupabaseIdeaErrorMessage("load your ideas", error);

    if (showAlertOnError) {
      alert(authStatus.textContent);
    }
  }
}

async function createIdeaInSupabase(idea) {
  const { error } = await supabaseClient.from(supabaseIdeasTableName).insert(createSupabaseIdeaPayload(idea));

  if (error) {
    throw error;
  }
}

async function updateIdeaInSupabase(ideaId, updates) {
  const { error } = await supabaseClient
    .from(supabaseIdeasTableName)
    .update(updates)
    .eq("id", ideaId)
    .eq("user_id", currentAuthUser.id);

  if (error) {
    throw error;
  }
}

async function deleteIdeaFromSupabase(ideaId) {
  const { error } = await supabaseClient
    .from(supabaseIdeasTableName)
    .delete()
    .eq("id", ideaId)
    .eq("user_id", currentAuthUser.id);

  if (error) {
    throw error;
  }
}

function getIdeaCreatedAtTime(idea) {
  return new Date(idea.createdAt).getTime();
}

function sortIdeasForDisplay(ideaEntries) {
  return ideaEntries.sort(function(leftEntry, rightEntry) {
    if (leftEntry.idea.pinned !== rightEntry.idea.pinned) {
      return leftEntry.idea.pinned ? -1 : 1;
    }

    const timeDifference = getIdeaCreatedAtTime(leftEntry.idea) - getIdeaCreatedAtTime(rightEntry.idea);

    if (timeDifference !== 0) {
      return activeSortOrder === "oldest" ? timeDifference : -timeDifference;
    }

    return leftEntry.index - rightEntry.index;
  });
}

function getVisibleIdeaEntries() {
  const searchQuery = ideaSearchInput.value.trim().toLowerCase();
  const visibleIdeas = [];

  ideas.forEach(function(idea, index) {
    if (
      !matchesIdeaSearch(idea, searchQuery) ||
      !matchesIdeaCategory(idea, activeCategoryFilter) ||
      !matchesFavoritesFilter(idea)
    ) {
      return;
    }

    visibleIdeas.push({
      idea: idea,
      index: index
    });
  });

  return sortIdeasForDisplay(visibleIdeas);
}

function getIdeaStats() {
  return ideas.reduce(
    function(stats, idea) {
      stats.totalIdeas += 1;

      if (idea.pinned) {
        stats.pinnedIdeas += 1;
      }

      if (idea.category === "Hook") {
        stats.hookIdeas += 1;
      } else if (idea.category === "Verse") {
        stats.verseIdeas += 1;
      } else if (idea.category === "Song Idea") {
        stats.songIdeaIdeas += 1;
      }

      return stats;
    },
    {
      totalIdeas: 0,
      pinnedIdeas: 0,
      hookIdeas: 0,
      verseIdeas: 0,
      songIdeaIdeas: 0
    }
  );
}

function updateStatsSection() {
  const stats = getIdeaStats();

  totalIdeasStat.textContent = String(stats.totalIdeas);
  pinnedIdeasStat.textContent = String(stats.pinnedIdeas);
  hookIdeasStat.textContent = String(stats.hookIdeas);
  verseIdeasStat.textContent = String(stats.verseIdeas);
  songIdeaIdeasStat.textContent = String(stats.songIdeaIdeas);
}

function buildVisibleIdeasExportText(visibleIdeaEntries) {
  return visibleIdeaEntries
    .map(function(entry, ideaPosition) {
      const idea = entry.idea;
      const sections = [
        (ideaPosition + 1) + ". " + (idea.title || "Untitled idea"),
        "Category: " + formatIdeaCategory(idea.category),
        "Timestamp: " + describeIdeaTimestamp(idea.createdAt)
      ];

      if (idea.pinned) {
        sections.push("Pinned: Yes");
      }

      sections.push("Lyric:");
      sections.push(idea.lyric || "");

      return sections.join("\n");
    })
    .join("\n\n--------------------\n\n");
}

function updateVisibleIdeasExport(visibleIdeaEntries) {
  if (!visibleIdeasExportIsOpen) {
    return;
  }

  if (visibleIdeaEntries.length === 0) {
    visibleIdeasExportPanel.hidden = true;
    visibleIdeasExportOutput.value = "";
    visibleIdeasExportStatus.textContent =
      "There are no visible ideas to export right now. Try changing your search or filters.";
    return;
  }

  visibleIdeasExportPanel.hidden = false;
  visibleIdeasExportOutput.value = buildVisibleIdeasExportText(visibleIdeaEntries);
  visibleIdeasExportStatus.textContent =
    "This export matches the ideas currently visible in the list. The text is selected so you can copy it.";
}

function updateStorageNotice() {
  if (isUsingSupabaseIdeas()) {
    storageNotice.textContent =
      "Signed-in mode: ideas load from your private Supabase account. Your signed-out browser ideas stay separate on this device.";
    storageNotice.hidden = false;
    storageNotice.classList.remove("is-warning");
    return;
  }

  storageNotice.textContent = storageNoticeMessage;
  storageNotice.hidden = false;
  storageNotice.classList.toggle("is-warning", storageNoticeIsWarning);
}

function updateComposerState() {
  if (editingIdeaIndex === null) {
    saveIdeaButton.textContent = "Save Idea";
    cancelEditButton.hidden = true;
    composerStatus.textContent =
      "Add a title, choose a category, and lock in the lyric while it is still fresh.";
    document.body.classList.remove("is-editing");
    return;
  }

  saveIdeaButton.textContent = "Update Idea";
  cancelEditButton.hidden = false;
  composerStatus.textContent =
    "Editing an existing idea. Update the title, category, or lyric, then save your changes.";
  document.body.classList.add("is-editing");
}

function resetForm() {
  editingIdeaIndex = null;
  songTitleInput.value = "";
  ideaCategorySelect.selectedIndex = 0;
  lyricIdeaInput.value = "";
  updateComposerState();
}

function startEditingIdea(index) {
  const idea = ideas[index];

  editingIdeaIndex = index;
  songTitleInput.value = idea.title || "";
  lyricIdeaInput.value = idea.lyric || "";

  if (ideaCategories.indexOf(idea.category) === -1) {
    ideaCategorySelect.selectedIndex = 0;
  } else {
    ideaCategorySelect.value = idea.category;
  }

  updateComposerState();
  songTitleInput.focus();
}

function updateIdeaCount(searchQuery, visibleIdeaCount) {
  const totalIdeas = ideas.length;
  const ideaLabel = totalIdeas === 1 ? "idea" : "ideas";

  if (searchQuery || activeCategoryFilter !== "All" || activeFavoritesOnly) {
    ideaCount.textContent = visibleIdeaCount + " of " + totalIdeas + " " + ideaLabel;
    return;
  }

  ideaCount.textContent = totalIdeas + " " + ideaLabel;
}

function renderEmptyState(list, searchQuery) {
  const emptyItem = document.createElement("li");
  emptyItem.className = "empty-state";

  const emptyTitle = document.createElement("h3");
  emptyTitle.className = "empty-state-title";
  emptyTitle.textContent = searchQuery ? "No matching ideas" : "No ideas saved yet";

  const emptyText = document.createElement("p");
  emptyText.className = "empty-state-text";
  emptyText.textContent = searchQuery
    ? "Try a different title or lyric search to find the draft you want."
    : "Your saved hooks, verses, and song concepts will show up here as polished cards.";

  emptyItem.appendChild(emptyTitle);
  emptyItem.appendChild(emptyText);
  list.appendChild(emptyItem);
}

function renderIdeas() {
  const list = document.getElementById("list");
  const searchQuery = ideaSearchInput.value.trim().toLowerCase();
  let visibleIdeaCount = 0;
  const visibleIdeas = getVisibleIdeaEntries();

  list.innerHTML = "";
  updateStatsSection();

  visibleIdeas.forEach(function(entry) {
    const idea = entry.idea;
    const index = entry.index;

    visibleIdeaCount += 1;

    const item = document.createElement("li");
    item.classList.toggle("is-pinned", idea.pinned === true);

    const ideaContent = document.createElement("div");
    ideaContent.className = "idea-content";

    const ideaCategory = document.createElement("span");
    ideaCategory.className = "idea-category";
    ideaCategory.textContent = formatIdeaCategory(idea.category);

    const ideaTitle = document.createElement("h3");
    ideaTitle.className = "idea-title";
    ideaTitle.textContent = idea.title || "Untitled idea";

    const ideaText = document.createElement("p");
    ideaText.className = "idea-text";
    ideaText.textContent = idea.lyric || "";

    const ideaTimestamp = document.createElement("span");
    ideaTimestamp.className = "idea-timestamp";
    ideaTimestamp.textContent = formatIdeaTimestamp(idea.createdAt);

    const ideaActions = document.createElement("div");
    ideaActions.className = "idea-actions";

    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.className = idea.pinned ? "pin-button is-pinned" : "pin-button";
    pinButton.textContent = idea.pinned ? "Pinned" : "Pin";
    pinButton.addEventListener("click", function() {
      togglePinnedIdea(index);
    });

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function() {
      startEditingIdea(index);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function() {
      deleteIdea(index);
    });

    ideaContent.appendChild(ideaCategory);
    ideaContent.appendChild(ideaTitle);
    ideaContent.appendChild(ideaText);
    ideaContent.appendChild(ideaTimestamp);
    item.appendChild(ideaContent);
    ideaActions.appendChild(pinButton);
    ideaActions.appendChild(editButton);
    ideaActions.appendChild(deleteButton);
    item.appendChild(ideaActions);
    list.appendChild(item);
  });

  updateIdeaCount(searchQuery, visibleIdeaCount);

  if (visibleIdeaCount === 0) {
    renderEmptyState(list, searchQuery);
  }

  updateVisibleIdeasExport(visibleIdeas);
}

async function deleteIdea(index) {
  const idea = ideas[index];
  const ideaTitle = idea && idea.title ? "\"" + idea.title + "\"" : "this idea";
  const confirmed = window.confirm("Delete " + ideaTitle + "? This cannot be undone.");

  if (!confirmed) {
    return;
  }

  if (isUsingSupabaseIdeas()) {
    if (!idea || idea.id === null) {
      alert("This idea is missing its Supabase id, so it cannot be deleted yet.");
      return;
    }

    try {
      await deleteIdeaFromSupabase(idea.id);
      await loadIdeasFromSupabase(true);
    } catch (error) {
      alert(getSupabaseIdeaErrorMessage("delete that idea", error));
    }

    return;
  }

  ideas.splice(index, 1);

  if (editingIdeaIndex === index) {
    resetForm();
  } else if (editingIdeaIndex !== null && editingIdeaIndex > index) {
    editingIdeaIndex -= 1;
  }

  saveIdeas();
  renderIdeas();
}

async function togglePinnedIdea(index) {
  if (isUsingSupabaseIdeas()) {
    const idea = ideas[index];

    if (!idea || idea.id === null) {
      alert("This idea is missing its Supabase id, so it cannot be pinned yet.");
      return;
    }

    try {
      await updateIdeaInSupabase(idea.id, {
        pinned: idea.pinned !== true
      });
      await loadIdeasFromSupabase(true);
    } catch (error) {
      alert(getSupabaseIdeaErrorMessage("update that pin", error));
    }

    return;
  }

  ideas[index] = {
    ...ideas[index],
    pinned: ideas[index].pinned !== true
  };

  saveIdeas();
  renderIdeas();
}

async function saveIdea() {
  const title = songTitleInput.value.trim();
  const category = ideaCategorySelect.value;
  const lyric = lyricIdeaInput.value.trim();

  if (!title || !category || !lyric) {
    alert("Fill out all fields");
    return;
  }

  if (isUsingSupabaseIdeas()) {
    try {
      if (editingIdeaIndex === null) {
        await createIdeaInSupabase({
          title: title,
          category: category,
          lyric: lyric,
          createdAt: new Date().toISOString(),
          pinned: false
        });
      } else {
        const idea = ideas[editingIdeaIndex];

        if (!idea || idea.id === null) {
          alert("This idea is missing its Supabase id, so it cannot be updated yet.");
          return;
        }

        await updateIdeaInSupabase(idea.id, {
          title: title,
          category: category,
          lyric: lyric
        });
      }

      resetForm();
      await loadIdeasFromSupabase(true);
    } catch (error) {
      alert(getSupabaseIdeaErrorMessage("save that idea", error));
    }

    return;
  }

  if (editingIdeaIndex === null) {
    ideas.push({
      title: title,
      category: category,
      lyric: lyric,
      createdAt: new Date().toISOString(),
      pinned: false
    });
  } else {
    ideas[editingIdeaIndex] = {
      ...ideas[editingIdeaIndex],
      title: title,
      category: category,
      lyric: lyric
    };
  }

  saveIdeas();
  resetForm();
  renderIdeas();
}

function cancelEdit() {
  resetForm();
}

function openImportIdeas() {
  importIdeasInput.click();
}

function importIdeasFromFile(event) {
  if (isUsingSupabaseIdeas()) {
    alert("Importing directly into Supabase is not connected yet. Please log out if you want to import browser-local ideas.");
    importIdeasInput.value = "";
    return;
  }

  const selectedFile = event.target.files && event.target.files[0];

  if (!selectedFile) {
    return;
  }

  const fileReader = new FileReader();

  fileReader.addEventListener("load", function(loadEvent) {
    try {
      const importedIdeas = parseImportedIdeas(loadEvent.target.result);
      const shouldReplaceIdeas =
        ideas.length === 0 ||
        window.confirm("Import " + importedIdeas.length + " ideas and replace your current library?");

      if (!shouldReplaceIdeas) {
        return;
      }

      ideas = importedIdeas;
      ideaSearchInput.value = "";
      setActiveCategoryFilter("All");
      activeFavoritesOnly = false;
      updateFavoritesOnlyButton();
      resetForm();
      saveIdeas();
      renderIdeas();
      alert("Imported " + importedIdeas.length + " ideas.");
    } catch (error) {
      alert(error.message || "We could not import that file.");
    } finally {
      importIdeasInput.value = "";
    }
  });

  fileReader.addEventListener("error", function() {
    alert("We could not read that file.");
    importIdeasInput.value = "";
  });

  fileReader.readAsText(selectedFile);
}

function exportIdeas() {
  if (ideas.length === 0) {
    alert("Add at least one idea before exporting a backup.");
    return;
  }

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    totalIdeas: ideas.length,
    ideas: ideas
  };
  const exportBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: "application/json"
  });
  const downloadUrl = URL.createObjectURL(exportBlob);
  const downloadLink = document.createElement("a");
  const dateLabel = new Date().toISOString().slice(0, 10);

  downloadLink.href = downloadUrl;
  downloadLink.download = "music-ideas-backup-" + dateLabel + ".json";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);
}

function exportVisibleIdeasText() {
  const visibleIdeaEntries = getVisibleIdeaEntries();

  visibleIdeasExportIsOpen = true;
  updateVisibleIdeasExport(visibleIdeaEntries);

  if (visibleIdeaEntries.length === 0) {
    alert("There are no visible ideas to export right now.");
    return;
  }

  visibleIdeasExportOutput.focus();
  visibleIdeasExportOutput.select();
  visibleIdeasExportOutput.setSelectionRange(0, visibleIdeasExportOutput.value.length);
}

ideaSearchInput.addEventListener("input", renderIdeas);
importIdeasInput.addEventListener("change", importIdeasFromFile);
exportVisibleIdeasButton.addEventListener("click", exportVisibleIdeasText);
signUpButton.addEventListener("click", signUpWithSupabase);
logInButton.addEventListener("click", logInWithSupabase);
logOutButton.addEventListener("click", logOutOfSupabase);
categoryFilters.addEventListener("click", function(event) {
  const filterButton = event.target.closest("[data-category-filter]");

  if (!filterButton) {
    return;
  }

  setActiveCategoryFilter(filterButton.dataset.categoryFilter);
  renderIdeas();
});
favoritesOnlyButton.addEventListener("click", function() {
  toggleFavoritesOnlyFilter();
  renderIdeas();
});
ideasSortOrderSelect.addEventListener("change", function() {
  activeSortOrder = ideasSortOrderSelect.value === "oldest" ? "oldest" : "newest";
  renderIdeas();
});

ideas = normalizeIdeasCollection(loadIdeasFromLocalStorage());
updateSignedOutIdeasSnapshot(ideas);
updateStorageNotice();
updateComposerState();
updateFavoritesOnlyButton();
renderIdeas();
initializeAuth();
