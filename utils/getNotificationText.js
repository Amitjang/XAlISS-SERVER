/**
 * @param {string} text Notification Text
 * @param {{}} data Notification data to replace in text
 * @returns Final notification text containing the information from the data object got after replacing in the string
 */
function getNotificationText(text, data) {
  const newText = text.replace(/\{(\w+)\}/g, (_str, match) =>
    data[match] === undefined ? `[[[${match} ⚠️]]]` : data[match]
  );

  return newText;
}

module.exports = { getNotificationText };
