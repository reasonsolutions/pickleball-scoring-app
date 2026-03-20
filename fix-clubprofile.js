// Add this code at the end of the ClubProfile.jsx file, after line 234 (after "const interests = [];")

        for (const interestDoc of interestsSnapshot.docs) {
          interests.push({
            id: interestDoc.id,
            ...interestDoc.data()
          });
        }
        
        setPlayerInterests(interests);
      } catch (error) {
        console.error('Error fetching player interests:', error);
      }
    };

    if (activeTab === 'players' && playersTab === 'interests') {
      fetchPlayerInterests();
    }
  }, [clubId, activeTab, playersTab]);

  // Filter players based on search and filters
  useEffect(() => {
    if (availablePlayers.length === 0) return;

    let filtered = availablePlayers.filter(player => {
      // Search by name or DUPR ID
      const matchesSearch = searchTerm === '' ||
        player.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.duprId?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by gender
      const matchesGender = filters.gender === '' ||
        player.gender?.toLowerCase() === filters.gender.toLowerCase();

      // Filter by DUPR ratings
      const singlesRating = parseFloat(player.singlesRating) || 0;
      const doublesRating = parseFloat(player.doublesRating) || 0;
      
      const matchesSinglesMin = filters.minSinglesRating === '' ||
        singlesRating >= parseFloat(filters.minSinglesRating);
      const matchesSinglesMax = filters.maxSinglesRating === '' ||
        singlesRating <= parseFloat(filters.maxSinglesRating);
      const matchesDoublesMin = filters.minDoublesRating === '' ||
        doublesRating >= parseFloat(filters.minDoublesRating);
      const matchesDoublesMax = filters.maxDoublesRating === '' ||
        doublesRating <= parseFloat(filters.maxDoublesRating);

      // Filter by age (calculate from date of birth)
      let matchesAge = true;
      if (player.dateOfBirth && (filters.minAge !== '' || filters.maxAge !== '')) {
        const birthDate = new Date(player.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        const matchesMinAge = filters.minAge === '' || age >= parseInt(filters.minAge);
        const matchesMaxAge = filters.maxAge === '' || age <= parseInt(filters.maxAge);
        matchesAge = matchesMinAge && matchesMaxAge;
      }

      return matchesSearch && matchesGender && matchesSinglesMin &&
             matchesSinglesMax && matchesDoublesMin && matchesDoublesMax && matchesAge;
    });

    setFilteredPlayers(filtered);
  }, [availablePlayers, searchTerm, filters]);