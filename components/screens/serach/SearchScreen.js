// components/screens/search/SearchScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../services/AuthContext';
import { recipeService } from '../../../services/recipeService';
import { groupService } from '../../../services/GroupService';
import { userService } from '../../../services/UserService';
import PostComponent from '../../common/PostComponent';
import UserAvatar from '../../common/UserAvatar';

const COOKSY_COLORS = {
  primary: '#F5A623',
  secondary: '#4ECDC4',
  accent: '#1F3A93',
  background: '#FFF8F0',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E8E8E8',
  success: '#27AE60',
  danger: '#E74C3C',
};

const SearchScreen = ({ navigation }) => {
  const { currentUser } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all'); // all, posts, users, groups
  const [searchResults, setSearchResults] = useState({
    posts: [],
    users: [],
    groups: []
  });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  // Debounced search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.trim().length >= 2) { // חיפוש מ-2 תווים
        performSearch();
      } else {
        setSearchResults({ posts: [], users: [], groups: [] });
      }
    }, 300); // דיליי של 300ms

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      console.log('🔍 Searching for:', searchQuery);
      
      // חיפוש מקבילי של כל הסוגים
      const [postsResult, usersResult, groupsResult] = await Promise.all([
        searchPosts(),
        searchUsers(),
        searchGroups()
      ]);

      setSearchResults({
        posts: postsResult || [],
        users: usersResult || [],
        groups: groupsResult || []
      });

      // שמור חיפוש אחרון
      addToRecentSearches(searchQuery);
      
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchPosts = async () => {
    try {
      const result = await recipeService.getAllRecipes();
      if (result.success) {
        const query = searchQuery.toLowerCase();
        return result.data.filter(post => 
          post.title?.toLowerCase().includes(query) ||
          post.description?.toLowerCase().includes(query) ||
          post.ingredients?.toLowerCase().includes(query) ||
          post.category?.toLowerCase().includes(query) ||
          post.userName?.toLowerCase().includes(query)
        );
      }
    } catch (error) {
      console.error('Search posts error:', error);
    }
    return [];
  };

  const searchUsers = async () => {
    try {
      // TODO: צריך endpoint מיוחד לחיפוש משתמשים
      // לעת עתה נחזיר מערך ריק
      return [];
    } catch (error) {
      console.error('Search users error:', error);
    }
    return [];
  };

  const searchGroups = async () => {
    try {
      const result = await groupService.getAllGroups(currentUser?.id || currentUser?._id);
      if (result.success) {
        const query = searchQuery.toLowerCase();
        return result.data.filter(group => 
          group.name?.toLowerCase().includes(query) ||
          group.description?.toLowerCase().includes(query) ||
          group.category?.toLowerCase().includes(query) ||
          group.creatorName?.toLowerCase().includes(query)
        );
      }
    } catch (error) {
      console.error('Search groups error:', error);
    }
    return [];
  };

  const addToRecentSearches = (query) => {
    setRecentSearches(prev => {
      const updated = [query, ...prev.filter(item => item !== query)].slice(0, 5);
      return updated;
    });
  };

  const handleRecentSearch = (query) => {
    setSearchQuery(query);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults({ posts: [], users: [], groups: [] });
  };

  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'all', label: 'All', count: searchResults.posts.length + searchResults.users.length + searchResults.groups.length },
        { key: 'posts', label: 'Recipes', count: searchResults.posts.length },
        { key: 'users', label: 'Users', count: searchResults.users.length },
        { key: 'groups', label: 'Groups', count: searchResults.groups.length }
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
          onPress={() => setSelectedTab(tab.key)}
        >
          <Text style={[styles.tabText, selectedTab === tab.key && styles.activeTabText]}>
            {tab.label} {tab.count > 0 && `(${tab.count})`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPost = ({ item }) => (
    <PostComponent
      post={item}
      navigation={navigation}
      onRefreshData={() => {}} // חיפוש לא צריך refresh
    />
  );

  const renderUser = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => navigation.navigate('Profile', { userId: item.id || item._id })}
    >
      <UserAvatar
        uri={item.avatar}
        name={item.fullName || item.name}
        size={50}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.fullName || item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.bio && <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COOKSY_COLORS.textLight} />
    </TouchableOpacity>
  );

  const renderGroup = ({ item }) => (
    <TouchableOpacity 
      style={styles.groupItem}
      onPress={() => navigation.navigate('GroupDetails', { groupId: item._id })}
    >
      <View style={styles.groupImageContainer}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.groupImage} />
        ) : (
          <View style={styles.placeholderGroupImage}>
            <Ionicons name="people" size={24} color={COOKSY_COLORS.textLight} />
          </View>
        )}
      </View>
      
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupDescription} numberOfLines={1}>
          {item.description || 'No description'}
        </Text>
        <View style={styles.groupMeta}>
          <Text style={styles.groupMetaText}>{item.membersCount} members</Text>
          <Text style={styles.groupMetaText}>•</Text>
          <Text style={styles.groupMetaText}>{item.category}</Text>
          {item.isPrivate && (
            <>
              <Text style={styles.groupMetaText}>•</Text>
              <Ionicons name="lock-closed" size={12} color={COOKSY_COLORS.textLight} />
            </>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COOKSY_COLORS.textLight} />
    </TouchableOpacity>
  );

  const renderRecentSearches = () => (
    <View style={styles.recentSearches}>
      <Text style={styles.sectionTitle}>Recent Searches</Text>
      {recentSearches.map((search, index) => (
        <TouchableOpacity
          key={index}
          style={styles.recentItem}
          onPress={() => handleRecentSearch(search)}
        >
          <Ionicons name="time-outline" size={16} color={COOKSY_COLORS.textLight} />
          <Text style={styles.recentText}>{search}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const getFilteredResults = () => {
    switch (selectedTab) {
      case 'posts':
        return searchResults.posts;
      case 'users':
        return searchResults.users;
      case 'groups':
        return searchResults.groups;
      default: // 'all'
        return [
          ...searchResults.posts.map(item => ({ ...item, type: 'post' })),
          ...searchResults.users.map(item => ({ ...item, type: 'user' })),
          ...searchResults.groups.map(item => ({ ...item, type: 'group' }))
        ];
    }
  };

  const renderSearchResult = ({ item }) => {
    if (selectedTab === 'all') {
      switch (item.type) {
        case 'post':
          return renderPost({ item });
        case 'user':
          return renderUser({ item });
        case 'group':
          return renderGroup({ item });
        default:
          return null;
      }
    } else {
      switch (selectedTab) {
        case 'posts':
          return renderPost({ item });
        case 'users':
          return renderUser({ item });
        case 'groups':
          return renderGroup({ item });
        default:
          return null;
      }
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={80} color={COOKSY_COLORS.textLight} />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No Results Found' : 'Start Searching'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery 
          ? `No results found for "${searchQuery}". Try different keywords.`
          : 'Search for recipes, users, or cooking groups'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COOKSY_COLORS.accent} />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COOKSY_COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, users, groups..."
            placeholderTextColor={COOKSY_COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close" size={20} color={COOKSY_COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {searchQuery.trim().length === 0 ? (
        <View style={styles.content}>
          {recentSearches.length > 0 && renderRecentSearches()}
          {renderEmptyState()}
        </View>
      ) : (
        <>
          {renderTabBar()}
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COOKSY_COLORS.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredResults()}
              keyExtractor={(item, index) => `${item._id || item.id || index}-${selectedTab}`}
              renderItem={renderSearchResult}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COOKSY_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COOKSY_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COOKSY_COLORS.border,
  },
  backButton: {
    padding: 8,
    backgroundColor: COOKSY_COLORS.background,
    borderRadius: 20,
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COOKSY_COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COOKSY_COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COOKSY_COLORS.text,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COOKSY_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COOKSY_COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COOKSY_COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COOKSY_COLORS.textLight,
  },
  activeTabText: {
    color: COOKSY_COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COOKSY_COLORS.textLight,
  },
  listContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COOKSY_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COOKSY_COLORS.border,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COOKSY_COLORS.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: COOKSY_COLORS.textLight,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 12,
    color: COOKSY_COLORS.textLight,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COOKSY_COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COOKSY_COLORS.border,
  },
  groupImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  groupImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderGroupImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COOKSY_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: COOKSY_COLORS.text,
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 14,
    color: COOKSY_COLORS.textLight,
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMetaText: {
    fontSize: 12,
    color: COOKSY_COLORS.textLight,
    marginRight: 6,
  },
  recentSearches: {
    backgroundColor: COOKSY_COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COOKSY_COLORS.text,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recentText: {
    fontSize: 16,
    color: COOKSY_COLORS.text,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COOKSY_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: COOKSY_COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SearchScreen;