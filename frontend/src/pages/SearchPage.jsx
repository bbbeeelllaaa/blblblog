import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchAPI } from '../services/api';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const tagParam = searchParams.get('tag') || '';
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [tagInput, setTagInput] = useState(tagParam);

  useEffect(() => {
    if (query) {
      doSearch();
    } else {
      setResults([]);
      setTotal(0);
    }
  }, [query, tagParam, page]);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const params = { q: query, page, size: 20 };
      if (tagParam) params.tag = tagParam;
      const res = await searchAPI.search(params);
      setResults(res.data.items);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const params = { q: searchInput.trim() };
      if (tagInput.trim()) params.tag = tagInput.trim();
      setSearchParams(params);
      setPage(1);
    }
  };

  const clearTag = () => {
    setTagInput('');
    setSearchParams({ q: query });
    setPage(1);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search articles..."
            className="input-field flex-1"
          />
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Tag (optional)"
            className="input-field w-36"
          />
          <button type="submit" className="btn-primary">Search</button>
        </div>
        {tagParam && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Tag: <span className="text-blue-600 font-medium">{tagParam}</span></span>
            <button type="button" onClick={clearTag} className="text-red-400 hover:text-red-600 text-xs">&times; clear</button>
          </div>
        )}
      </form>

      {query && (
        <div className="mb-4">
          <h2 className="text-lg text-gray-600">
            {total} result{total !== 1 ? 's' : ''} for &quot;{query}&quot;
          </h2>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Searching...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {query ? 'No results found. Try a different keyword.' : 'Enter a keyword to search.'}
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((item) => (
            <div key={item.id} className="card hover:shadow-md transition-shadow">
              <Link to={`/articles/${item.id}`}>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-1">
                  {item.title}
                </h3>
              </Link>
              {item.summary && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.summary}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <Link to={`/users/${item.author_id}`} className="flex items-center gap-1 hover:text-blue-500">
                  {item.author_avatar ? (
                    <img src={item.author_avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : null}
                  {item.author_name}
                </Link>
                <span>{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                {item.like_count > 0 && <span>{item.like_count} likes</span>}
                {item.comment_count > 0 && <span>{item.comment_count} comments</span>}
                {item.relevance > 0 && (
                  <span className="text-blue-500">Relevance: {(item.relevance * 100).toFixed(0)}%</span>
                )}
              </div>
              {item.tags?.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {item.tags.map((tag) => (
                    <span key={tag.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-3 mt-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary">
            Previous
          </button>
          <span className="text-gray-500 self-center">Page {page} / {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn-secondary">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
