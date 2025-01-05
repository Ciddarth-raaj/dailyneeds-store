export function useAccount(id) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const data = await AccountsHelper.getAccountById(id);
      if (!data.code) {
        setAccount(data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAccount();
    }
  }, [id]);

  return { account, loading, error, refetch: fetchAccount };
}
