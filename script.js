function generateIdeaId() {
  return "idea-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let ideas = JSON.parse(localStorage.getItem("musicIdeas")) || [];
const ideaCategories = ["Hook", "Verse", "Song Idea"];
let editingIdeaIndex = null;
let activeCategoryFilter = "All";
let animatedIdeaId = null;
let animatedIdeaMode = "";
let clearAnimatedIdeaTimeoutId = null;
let ideasWereNormalized = false;

ideas = ideas.map(function(idea) {
  if (idea && idea.id) {
    return idea;
  }

  ideasWereNormalized = true;

  return {
    ...(idea && typeof idea === "object" ? idea : {}),
    id: generateIdeaId()
  };
});

const songTitleInput = document.getElementById("songTitle");
const ideaCategorySelect = document.getElementById("ideaCategory");
const lyricIdeaInput = document.getElementById("lyricIdea");
const ideaSearchInput = document.getElementById("ideaSearch");
const saveIdeaButton = document.getElementById("saveIdeaButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const composerStatus = document.getElementById("composerStatus");
const ideaCount = document.getElementById("ideaCount");
const categoryFilters = document.getElementById("categoryFilters");

function formatIdeaCategory(category) {
  if (ideaCategories.indexOf(category) === -1) {
    return "No category";
  }

  return category;
}

function formatIdeaTimestamp(createdAt) {
  if (!createdAt) {
    return "Created before timestamps were added";
  }

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return "Created date unavailable";
  }

  return "Created " + createdDate.toLocaleString();
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

function saveIdeas() {
  localStorage.setItem("musicIdeas", JSON.stringify(ideas));
}

if (ideasWereNormalized) {
  saveIdeas();
}

function setAnimatedIdea(id, mode) {
  if (prefersReducedMotion()) {
    return;
  }

  animatedIdeaId = id;
  animatedIdeaMode = mode;

  if (clearAnimatedIdeaTimeoutId !== null) {
    window.clearTimeout(clearAnimatedIdeaTimeoutId);
  }

  clearAnimatedIdeaTimeoutId = window.setTimeout(function() {
    animatedIdeaId = null;
    animatedIdeaMode = "";
    clearAnimatedIdeaTimeoutId = null;
  }, 450);
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

  if (searchQuery || activeCategoryFilter !== "All") {
    ideaCount.textContent = visibleIdeaCount + " of " + totalIdeas + " " + ideaLabel;
    return;
  }

  ideaCount.textContent = totalIdeas + " " + ideaLabel;
}

function renderEmptyState(list, searchQuery) {
  const emptyItem = document.createElement("li");
  emptyItem.className = "idea-card empty-state";

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

  list.innerHTML = "";

  ideas.forEach(function(idea, index) {
    if (!matchesIdeaSearch(idea, searchQuery) || !matchesIdeaCategory(idea, activeCategoryFilter)) {
      return;
    }

    visibleIdeaCount += 1;

    const item = document.createElement("li");
    item.className = "idea-card";

    if (idea.id === animatedIdeaId) {
      item.classList.add(animatedIdeaMode === "updating" ? "is-updating" : "is-entering");
    }

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
      deleteIdea(index, item);
    });

    ideaContent.appendChild(ideaCategory);
    ideaContent.appendChild(ideaTitle);
    ideaContent.appendChild(ideaText);
    ideaContent.appendChild(ideaTimestamp);
    item.appendChild(ideaContent);
    ideaActions.appendChild(editButton);
    ideaActions.appendChild(deleteButton);
    item.appendChild(ideaActions);
    list.appendChild(item);
  });

  updateIdeaCount(searchQuery, visibleIdeaCount);

  if (visibleIdeaCount === 0) {
    renderEmptyState(list, searchQuery);
  }
}

function finalizeDelete(index) {
  ideas.splice(index, 1);

  if (editingIdeaIndex === index) {
    resetForm();
  } else if (editingIdeaIndex !== null && editingIdeaIndex > index) {
    editingIdeaIndex -= 1;
  }

  saveIdeas();
  renderIdeas();
}

function deleteIdea(index, item) {
  if (!item || prefersReducedMotion()) {
    finalizeDelete(index);
    return;
  }

  item.classList.add("is-removing");
  item.querySelectorAll("button").forEach(function(button) {
    button.disabled = true;
  });

  window.setTimeout(function() {
    finalizeDelete(index);
  }, 220);
}

function saveIdea() {
  const title = songTitleInput.value.trim();
  const category = ideaCategorySelect.value;
  const lyric = lyricIdeaInput.value.trim();

  if (!title || !category || !lyric) {
    alert("Fill out all fields");
    return;
  }

  if (editingIdeaIndex === null) {
    const newIdea = {
      id: generateIdeaId(),
      title: title,
      category: category,
      lyric: lyric,
      createdAt: new Date().toISOString()
    };

    ideas.push(newIdea);
    setAnimatedIdea(newIdea.id, "entering");
  } else {
    const existingIdea = ideas[editingIdeaIndex];

    ideas[editingIdeaIndex] = {
      ...existingIdea,
      id: existingIdea.id || generateIdeaId(),
      title: title,
      category: category,
      lyric: lyric
    };

    setAnimatedIdea(ideas[editingIdeaIndex].id, "updating");
  }

  saveIdeas();
  resetForm();
  renderIdeas();
}

function cancelEdit() {
  resetForm();
}

ideaSearchInput.addEventListener("input", renderIdeas);
categoryFilters.addEventListener("click", function(event) {
  const filterButton = event.target.closest("[data-category-filter]");

  if (!filterButton) {
    return;
  }

  activeCategoryFilter = filterButton.dataset.categoryFilter;

  Array.from(categoryFilters.querySelectorAll("[data-category-filter]")).forEach(function(button) {
    button.classList.toggle("is-active", button === filterButton);
  });

  renderIdeas();
});

updateComposerState();
renderIdeas();
