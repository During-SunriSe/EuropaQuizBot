export async function translate(language, text, from = "ru") {
  const translateUrl =
    "https://translate.googleapis.com/translate_a/single?format=text&client=gtx&sl=" +
    from +
    "&tl=" +
    language +
    "&dt=t&q=" +
    text;
  try {
    const response = await fetch(translateUrl);
    if (response.ok) {
      const json = await response.json();
      let antwort = json[0][0][0];
      antwort = antwort.replaceAll("N", "\n");
      return antwort;
    } else {
      console.log("Ошибка HTTP: " + response.status);
    }
    return "";
  } catch (e) {
    return "Бот перегружен...";
  }
}
