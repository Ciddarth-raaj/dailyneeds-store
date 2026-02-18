/**
 * Custom error page - must not use Chakra or other context-dependent components
 * to avoid cascading errors when Next.js tries to render this page.
 */
function Error({ statusCode }) {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <h1>{statusCode ? `Error ${statusCode}` : "An error occurred"}</h1>
      <p>
        {statusCode
          ? `An error ${statusCode} occurred on the server.`
          : "An error occurred on the client."}
      </p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
