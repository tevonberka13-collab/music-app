const ideaCategories = ["Hook", "Verse", "Song Idea"];
const storageKey = "musicIdeas";
let ideas = [];
let editingIdeaIndex = null;
let activeCategoryFilter = "All";
let activeSortOrder = "newest";
let visibleIdeasExportIsOpen = false;
let storageNoticeMessage =
  "Ideas are currently saved only in this browser. Export a backup if you want a copy outside this device.";
let storageNoticeIsWarning = false;

const songTitleInput = document.getElementById("songTitle");
const ideaCategorySelect = document.getElementById("ideaCategory");
const lyricIdeaInput = document.getElementById("lyricIdea");
const ideaSearchInput = document.getElementById("ideaSearch");
const saveIdeaButton = document.getElementById("saveIdeaButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const importIdeasInput = document.getElementById("importIdeasInput");
const composerStatus = document.getElementById("composerStatus");
const ideaCount = document.getElementById("ideaCount");
const categoryFilters = document.getElementById("categoryFilters");
const ideasSortOrderSelect = document.getElementById("ideasSortOrder");
const exportVisibleIdeasButton = document.getElementById("exportVisibleIdeasButton");
const visibleIdeasExportPanel = document.getElementById("visibleIdeasExportPanel");
const visibleIdeasExportOutput = document.getElementById("visibleIdeasExportOutput");
const visibleIdeasExportStatus = document.getElementById("visibleIdeasExportStatus");
const storageNotice = document.getElementById("storageNotice");

function loadIdeas() {
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

function updateCategoryFilterButtons() {
  Array.from(categoryFilters.querySelectorAll("[data-category-filter]")).forEach(function(button) {
    button.classList.toggle("is-active", button.dataset.categoryFilter === activeCategoryFilter);
  });
}

function setActiveCategoryFilter(categoryFilter) {
  activeCategoryFilter = categoryFilter;
  updateCategoryFilterButtons();
}

function normalizeIdea(idea) {
  if (!idea || typeof idea !== "object") {
    return null;
  }

  const title = typeof idea.title === "string" ? idea.title.trim() : "";
  const lyric = typeof idea.lyric === "string" ? idea.lyric.trim() : "";
  const category = typeof idea.category === "string" ? idea.category : "";
  const pinned = idea.pinned === true;
  const createdAt =
    typeof idea.createdAt === "string" && !Number.isNaN(new Date(idea.createdAt).getTime())
      ? idea.createdAt
      : new Date().toISOString();

  if (!title || !lyric) {
    return null;
  }

  return {
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

  const normalizedIdeas = rawIdeas
    .map(normalizeIdea)
    .filter(function(idea) {
      return idea !== null;
    });

  if (normalizedIdeas.length === 0) {
    throw new Error("That backup did not contain any valid ideas to import.");
  }

  return normalizedIdeas;
}

function saveIdeas() {
  localStorage.setItem(storageKey, JSON.stringify(ideas));
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
    if (!matchesIdeaSearch(idea, searchQuery) || !matchesIdeaCategory(idea, activeCategoryFilter)) {
      return;
    }

    visibleIdeas.push({
      idea: idea,
      index: index
    });
  });

  return sortIdeasForDisplay(visibleIdeas);
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

  if (searchQuery || activeCategoryFilter !== "All") {
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

function deleteIdea(index) {
  const idea = ideas[index];
  const ideaTitle = idea && idea.title ? "\"" + idea.title + "\"" : "this idea";
  const confirmed = window.confirm("Delete " + ideaTitle + "? This cannot be undone.");

  if (!confirmed) {
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

function togglePinnedIdea(index) {
  ideas[index] = {
    ...ideas[index],
    pinned: ideas[index].pinned !== true
  };

  saveIdeas();
  renderIdeas();
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
categoryFilters.addEventListener("click", function(event) {
  const filterButton = event.target.closest("[data-category-filter]");

  if (!filterButton) {
    return;
  }

  setActiveCategoryFilter(filterButton.dataset.categoryFilter);
  renderIdeas();
});
ideasSortOrderSelect.addEventListener("change", function() {
  activeSortOrder = ideasSortOrderSelect.value === "oldest" ? "oldest" : "newest";
  renderIdeas();
});

ideas = loadIdeas()
  .map(normalizeIdea)
  .filter(function(idea) {
    return idea !== null;
  });
updateStorageNotice();
updateComposerState();
renderIdeas();
