let ideas = JSON.parse(localStorage.getItem("musicIdeas")) || [];
const ideaCategories = ["Hook", "Verse", "Song Idea"];
let editingIdeaIndex = null;

const songTitleInput = document.getElementById("songTitle");
const ideaCategorySelect = document.getElementById("ideaCategory");
const lyricIdeaInput = document.getElementById("lyricIdea");
const ideaSearchInput = document.getElementById("ideaSearch");
const saveIdeaButton = document.getElementById("saveIdeaButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const composerStatus = document.getElementById("composerStatus");
const ideaCount = document.getElementById("ideaCount");

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

function saveIdeas() {
  localStorage.setItem("musicIdeas", JSON.stringify(ideas));
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

  if (searchQuery) {
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

  list.innerHTML = "";

  ideas.forEach(function(idea, index) {
    if (!matchesIdeaSearch(idea, searchQuery)) {
      return;
    }

    visibleIdeaCount += 1;

    const item = document.createElement("li");

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
      deleteIdea(index);
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

function deleteIdea(index) {
  ideas.splice(index, 1);

  if (editingIdeaIndex === index) {
    resetForm();
  } else if (editingIdeaIndex !== null && editingIdeaIndex > index) {
    editingIdeaIndex -= 1;
  }

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
      createdAt: new Date().toISOString()
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

ideaSearchInput.addEventListener("input", renderIdeas);

updateComposerState();
renderIdeas();
