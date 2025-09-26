export const getEmailMessages = async (gmail, query, maxResults = 10) => {
  const emailListResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  return emailListResponse.data.messages;
};
