let ideas = JSON.parse(localStorage.getItem("musicIdeas")) || [];
const ideaCategories = ["Hook", "Verse", "Song Idea"];

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

function renderIdeas() {
  const list = document.getElementById("list");
  const searchQuery = document
    .getElementById("ideaSearch")
    .value
    .trim()
    .toLowerCase();

  list.innerHTML = "";

  ideas.forEach(function(idea, index) {
    if (!matchesIdeaSearch(idea, searchQuery)) {
      return;
    }

    const item = document.createElement("li");

    const ideaContent = document.createElement("div");
    ideaContent.className = "idea-content";

    const ideaCategory = document.createElement("span");
    ideaCategory.className = "idea-category";
    ideaCategory.textContent = formatIdeaCategory(idea.category);

    const ideaText = document.createElement("span");
    ideaText.className = "idea-text";
    ideaText.textContent = idea.title + ": " + idea.lyric;

    const ideaTimestamp = document.createElement("span");
    ideaTimestamp.className = "idea-timestamp";
    ideaTimestamp.textContent = formatIdeaTimestamp(idea.createdAt);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function() {
      deleteIdea(index);
    });

    ideaContent.appendChild(ideaCategory);
    ideaContent.appendChild(ideaText);
    ideaContent.appendChild(ideaTimestamp);
    item.appendChild(ideaContent);
    item.appendChild(deleteButton);
    list.appendChild(item);
  });
}

function deleteIdea(index) {
  ideas.splice(index, 1);
  localStorage.setItem("musicIdeas", JSON.stringify(ideas));
  renderIdeas();
}

function saveIdea() {
  const title = document.getElementById("songTitle").value.trim();
  const category = document.getElementById("ideaCategory").value;
  const lyric = document.getElementById("lyricIdea").value.trim();

  if (!title || !category || !lyric) {
    alert("Fill out all fields");
    return;
  }

  const newIdea = {
    title: title,
    category: category,
    lyric: lyric,
    createdAt: new Date().toISOString()
  };

  ideas.push(newIdea);

  localStorage.setItem("musicIdeas", JSON.stringify(ideas));

  document.getElementById("songTitle").value = "";
  document.getElementById("ideaCategory").selectedIndex = 0;
  document.getElementById("lyricIdea").value = "";

  renderIdeas();
}

document.getElementById("ideaSearch").addEventListener("input", renderIdeas);

renderIdeas();
