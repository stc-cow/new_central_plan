const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0GkXnQMdKYZITuuMsAzeWDtGUqEJ3lWwqNdA67NewOsDOgqsZHKHECEEkea4nrukx4-DqxKmf62nC/pub?gid=1149576218&single=true&output=csv";

exports.handler = async (event, context) => {
  try {
    console.log("Fetching CSV from Google Sheets...");
    
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Failed to fetch CSV: ${response.statusText}` }),
      };
    }

    const csvText = await response.text();
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
      },
      body: csvText,
    };
  } catch (error) {
    console.error("Error fetching CSV:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
