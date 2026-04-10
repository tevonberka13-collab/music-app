let ideas = JSON.parse(localStorage.getItem("musicIdeas")) || [];

function renderIdeas() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  ideas.forEach(function(idea) {
    const item = document.createElement("li");
    item.textContent = idea.title + ": " + idea.lyric;
    list.appendChild(item);
  });
}

function saveIdea() {
  const title = document.getElementById("songTitle").value.trim();
  const lyric = document.getElementById("lyricIdea").value.trim();

  if (!title || !lyric) {
    alert("Fill out both fields");
    return;
  }

  const newIdea = {
    title: title,
    lyric: lyric
  };

  ideas.push(newIdea);

  localStorage.setItem("musicIdeas", JSON.stringify(ideas));

  document.getElementById("songTitle").value = "";
  document.getElementById("lyricIdea").value = "";

  renderIdeas();
}

renderIdeas();