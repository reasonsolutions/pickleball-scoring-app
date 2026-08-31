import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CCPLNavbar from '../components/CCPLNavbar';
import CCPLFooter from '../components/CCPLFooter';

export default function CcplNewsArticle() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const accentColor = '#ee3a24';
  const accentColorDark = '#7d0f0f';

  useEffect(() => {
    const updateSize = () => {
      setIsMobile(window.innerWidth < 860);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        
        // Fetch the article
        const articleDoc = await getDoc(doc(db, 'news', id));
        if (articleDoc.exists()) {
          setArticle({ id: articleDoc.id, ...articleDoc.data() });
        }

        // Fetch related articles
        const relatedQuery = query(
          collection(db, 'news'),
          orderBy('publishDate', 'desc'),
          limit(4)
        );
        const relatedSnapshot = await getDocs(relatedQuery);
        const related = relatedSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => a.id !== id)
          .slice(0, 3);
        setRelatedArticles(related);
      } catch (error) {
        console.error('Error fetching article:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <>
        <style>{`
          @font-face {
            font-family: 'Zuume Cut';
            src: url('/fonts/zuume-cut-black.ttf') format('truetype');
            font-weight: 900;
            font-style: normal;
          }
          @font-face {
            font-family: 'Zuume Cut';
            src: url('/fonts/zuume-cut-black-italic.ttf') format('truetype');
            font-weight: 900;
            font-style: italic;
          }
          body { margin: 0; background: #0b0b0c; }
        `}</style>
        <CCPLNavbar />
        <div style={{ 
          minHeight: '100vh', 
          background: '#0b0b0c', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: "'Montserrat', sans-serif"
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              border: `3px solid ${accentColor}`, 
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <p style={{ fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>Loading Article...</p>
          </div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  if (!article) {
    return (
      <>
        <CCPLNavbar />
        <div style={{ 
          minHeight: '100vh', 
          background: '#0b0b0c', 
          color: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontFamily: "'Montserrat', sans-serif",
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            <h1 style={{ 
              fontFamily: "'Zuume Cut', sans-serif", 
              fontSize: '48px', 
              color: accentColor,
              marginBottom: '20px'
            }}>404</h1>
            <p style={{ fontSize: '18px', marginBottom: '30px' }}>Article not found</p>
            <Link to="/ccpl-home" style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColorDark})`,
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600
            }}>
              Back to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-black.ttf') format('truetype');
          font-weight: 900;
          font-style: normal;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-black-italic.ttf') format('truetype');
          font-weight: 900;
          font-style: italic;
        }
        @font-face {
          font-family: 'Zuume Cut';
          src: url('/fonts/zuume-cut-bold.ttf') format('truetype');
          font-weight: 700;
          font-style: normal;
        }
        
        body {
          margin: 0;
          background: #0b0b0c;
        }
        
        ::selection {
          background: ${accentColor};
          color: #0b0b0c;
        }
        
        @keyframes cc-fade-up {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .cc-in {
          opacity: 0;
          animation: cc-fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .cc-article-content {
          font-family: 'Montserrat', sans-serif;
          font-size: 17px;
          line-height: 1.8;
          color: rgba(255,255,255,0.85);
        }
        
        .cc-article-content p {
          margin: 0 0 24px;
        }
        
        .cc-article-content h2 {
          font-family: 'Zuume Cut', sans-serif;
          font-weight: 900;
          font-style: italic;
          font-size: 32px;
          line-height: 1.2;
          margin: 48px 0 24px;
          text-transform: uppercase;
          color: #fff;
        }
        
        .cc-article-content h3 {
          font-family: 'Zuume Cut', sans-serif;
          font-weight: 700;
          font-size: 24px;
          line-height: 1.3;
          margin: 36px 0 20px;
          text-transform: uppercase;
          color: #fff;
        }
        
        .cc-article-content strong {
          color: ${accentColor};
          font-weight: 700;
        }
        
        .cc-article-content a {
          color: ${accentColor};
          text-decoration: underline;
        }
        
        .cc-article-content a:hover {
          color: #fff;
        }
        
        .cc-article-content ul, .cc-article-content ol {
          margin: 0 0 24px;
          padding-left: 24px;
        }
        
        .cc-article-content li {
          margin-bottom: 12px;
        }
        
        .cc-tile {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        .cc-tile:hover {
          transform: translateY(-6px);
        }
      `}</style>

      <CCPLNavbar />

      <div style={{ background: '#0b0b0c', minHeight: '100vh' }}>
        {/* Hero Section */}
        <section style={{
          position: 'relative',
          background: '#0b0b0c',
          color: '#fff',
          fontFamily: "'Montserrat', sans-serif",
          padding: isMobile ? '32px 6vw 48px' : '56px 6vw 72px',
          boxSizing: 'border-box'
        }}>
          {/* Back Link */}
          <Link to="/ccpl-home" className="cc-in" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'none',
            marginBottom: isMobile ? '24px' : '32px',
            animationDelay: '0.05s',
            transition: 'gap 0.25s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.gap = '12px'}
          onMouseLeave={(e) => e.currentTarget.style.gap = '8px'}
          >
            <span style={{ fontSize: '14px' }}>←</span> Back to Home
          </Link>

          {/* Article Meta */}
          <div className="cc-in" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: isMobile ? '20px' : '28px',
            flexWrap: 'wrap',
            animationDelay: '0.15s'
          }}>
            <span style={{
              padding: '6px 14px',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColorDark})`,
              fontSize: '10px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 600
            }}>
              {article.featured ? 'Featured' : 'News'}
            </span>
            <span style={{
              fontSize: '12px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)'
            }}>
              {formatDate(article.publishDate)}
            </span>
          </div>

          {/* Title */}
          <h1 className="cc-in" style={{
            fontFamily: "'Zuume Cut', sans-serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 'clamp(36px, 6vw, 72px)',
            lineHeight: 0.95,
            margin: '0 0 20px',
            textTransform: 'uppercase',
            maxWidth: '1200px',
            animationDelay: '0.25s'
          }}>
            {article.title}
          </h1>

          {/* Subtext */}
          {article.subtext && (
            <p className="cc-in" style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.7)',
              maxWidth: '800px',
              margin: '0 0 40px',
              animationDelay: '0.35s'
            }}>
              {article.subtext}
            </p>
          )}

          {/* Featured Image */}
          {(article.featuredImage?.secure_url || article.featuredImage?.url) && (
            <div className="cc-in" style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1400px',
              aspectRatio: isMobile ? '16/10' : '16/9',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.18)',
              marginBottom: isMobile ? '40px' : '64px',
              animationDelay: '0.45s'
            }}>
              <img
                src={article.featuredImage.secure_url || article.featuredImage.url}
                alt={article.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #0b0b0c 100%)';
                }}
              />
            </div>
          )}
        </section>

        {/* Article Content */}
        <section style={{
          position: 'relative',
          background: '#0b0b0c',
          color: '#fff',
          fontFamily: "'Montserrat', sans-serif",
          padding: isMobile ? '0 6vw 56px' : '0 6vw 88px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div 
              className="cc-article-content cc-in"
              style={{ animationDelay: '0.55s' }}
              dangerouslySetInnerHTML={{ __html: article.descriptionHtml || article.description }}
            />
          </div>
        </section>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section style={{
            position: 'relative',
            background: '#0b0b0c',
            color: '#fff',
            fontFamily: "'Montserrat', sans-serif",
            padding: isMobile ? '48px 6vw 56px' : '72px 6vw 88px',
            boxSizing: 'border-box',
            borderTop: '1px solid rgba(255,255,255,0.14)'
          }}>
            <h2 className="cc-in" style={{
              fontFamily: "'Zuume Cut', sans-serif",
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 'clamp(28px, 3vw, 42px)',
              lineHeight: 0.95,
              margin: '0 0 32px',
              textTransform: 'uppercase',
              animationDelay: '0.65s'
            }}>
              More Stories
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? '20px' : '28px'
            }}>
              {relatedArticles.map((related, idx) => (
                <Link
                  key={related.id}
                  to={`/news/${related.id}`}
                  className="cc-tile cc-in"
                  style={{
                    position: 'relative',
                    display: 'block',
                    height: isMobile ? '200px' : '280px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.18)',
                    textDecoration: 'none',
                    color: '#fff',
                    animationDelay: `${0.75 + idx * 0.1}s`
                  }}
                >
                  {related.featuredImage?.secure_url || related.featuredImage?.url ? (
                    <>
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <img
                          src={related.featuredImage.secure_url || related.featuredImage.url}
                          alt={related.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #0b0b0c 100%)';
                          }}
                        />
                      </div>
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(11,11,12,0) 35%, rgba(11,11,12,0.85) 80%, #0b0b0c 100%)',
                        pointerEvents: 'none'
                      }}></div>
                    </>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #0b0b0c 100%)'
                    }}></div>
                  )}
                  <div style={{
                    position: 'absolute',
                    left: '18px',
                    right: '18px',
                    bottom: '18px',
                    pointerEvents: 'none'
                  }}>
                    <span style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: accentColor,
                      marginBottom: '8px'
                    }}>
                      {related.featured ? 'Featured' : 'News'}
                    </span>
                    <h4 style={{
                      fontFamily: "'Zuume Cut', sans-serif",
                      fontWeight: 900,
                      fontStyle: 'italic',
                      fontSize: '19px',
                      lineHeight: 1,
                      margin: 0,
                      textTransform: 'uppercase'
                    }}>
                      {related.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <CCPLFooter />
    </>
  );
}
