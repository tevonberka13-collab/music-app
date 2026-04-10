function saveIdea() {
  const title = document.getElementById("songTitle").value;
  const lyric = document.getElementById("lyricIdea").value;

  if (!title || !lyric) {
    alert("Fill out both fields");
    return;
  }

  const list = document.getElementById("list");

  const item = document.createElement("li");
  item.textContent = title + ": " + lyric;

  list.appendChild(item);

  document.getElementById("songTitle").value = "";
  document.getElementById("lyricIdea").value = "";
}