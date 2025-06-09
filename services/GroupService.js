// services/GroupService.js

import axios from 'axios';

class GroupService {
  constructor() {
    this.baseURL = 'http://192.168.1.222:3000/api'; // עדכן לפי הכתובת שלך
    
    // הגדרת axios עם timeout ארוך יותר
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 שניות
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Create new group
  async createGroup(groupData, imageUri = null) {
    try {
      console.log('🔄 Creating group...');
      
      const formData = new FormData();
      
      // הוספת נתוני הקבוצה
      formData.append('name', groupData.name);
      formData.append('description', groupData.description || '');
      formData.append('category', groupData.category || 'General');
      formData.append('rules', groupData.rules || '');
      formData.append('creatorId', groupData.creatorId);
      formData.append('isPrivate', groupData.isPrivate.toString());
      formData.append('allowMemberPosts', groupData.allowMemberPosts.toString());
      formData.append('requireApproval', groupData.requireApproval.toString());
      formData.append('allowInvites', groupData.allowInvites.toString());

      // הוספת תמונה אם יש
      if (imageUri) {
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'group-image.jpg',
        });
      }

      const response = await this.axiosInstance.post('/groups', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 שניות למעלה תמונות
      });

      console.log('✅ Group created successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Create group error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Request timeout - please check your connection and try again'
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Get all groups - עדכון לתמוך בחיפוש
  async getAllGroups(userId = null, includePrivateForSearch = false) {
    try {
      console.log('🔄 Fetching groups...');
      
      const params = {};
      if (userId) params.userId = userId;
      if (includePrivateForSearch) params.includePrivate = 'true';
      
      const response = await this.axiosInstance.get('/groups', { 
        params,
        timeout: 15000 // 15 שניות
      });

      console.log('✅ Groups fetched successfully:', response.data.length);
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Fetch groups error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Connection timeout - please check your network and try again'
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ פונקציה נפרדת לחיפוש קבוצות - עם fallback
  async searchGroups(query, userId = null) {
    try {
      console.log('🔍 Searching groups for:', query);
      
      const params = { 
        q: query,
        includePrivate: 'true' // כלול קבוצות פרטיות בחיפוש
      };
      if (userId) params.userId = userId;
      
      try {
        // נסה endpoint החיפוש הייעודי
        const response = await this.axiosInstance.get('/groups/search', { 
          params,
          timeout: 15000
        });

        console.log('✅ Groups search completed:', response.data.length, 'results');
        return {
          success: true,
          data: response.data
        };
      } catch (searchError) {
        console.log('❌ Search endpoint failed, falling back to getAllGroups with filter');
        
        // Fallback: השתמש ב-getAllGroups עם סינון מקומי
        const allGroupsParams = { includePrivate: 'true' };
        if (userId) allGroupsParams.userId = userId;
        
        const response = await this.axiosInstance.get('/groups', { 
          params: allGroupsParams,
          timeout: 15000
        });

        // סנן מקומית
        const filtered = response.data.filter(group => {
          const searchTerm = query.toLowerCase();
          return (
            group.name?.toLowerCase().includes(searchTerm) ||
            group.description?.toLowerCase().includes(searchTerm) ||
            group.category?.toLowerCase().includes(searchTerm) ||
            group.creatorName?.toLowerCase().includes(searchTerm)
          );
        });

        console.log('✅ Fallback search completed:', filtered.length, 'results');
        return {
          success: true,
          data: filtered
        };
      }
      
    } catch (error) {
      console.error('❌ Search groups error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Get single group with details - תיקון לaxiosInstance
  async getGroup(groupId) {
    try {
      console.log('🔄 Fetching group details for ID:', groupId);
      
      const response = await this.axiosInstance.get(`/groups/${groupId}`);

      console.log('✅ Group details fetched successfully:', response.data.name);
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Fetch group details error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Join group - תיקון לaxiosInstance
  async joinGroup(groupId, userId) {
    try {
      console.log('🔄 Joining group...');
      
      const response = await this.axiosInstance.post(`/groups/${groupId}/join`, {
        userId
      });

      console.log('✅ Join request sent successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Join group error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ ביטול בקשת הצטרפות לקבוצה - פונקציה חדשה
  async cancelJoinRequest(groupId, userId) {
    try {
      console.log('🔄 Canceling join request...');
      
      const response = await this.axiosInstance.delete(`/groups/${groupId}/join`, {
        data: { userId }
      });

      console.log('✅ Join request canceled successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Cancel join request error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Handle join request - תיקון לaxiosInstance
  async handleJoinRequest(groupId, userId, action, adminId) {
    try {
      console.log(`🔄 ${action}ing join request...`);
      
      const response = await this.axiosInstance.put(`/groups/${groupId}/requests/${userId}`, {
        action,
        adminId
      });

      console.log(`✅ Join request ${action}ed successfully`);
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error(`❌ ${action} join request error:`, error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Leave group - תיקון לaxiosInstance
  async leaveGroup(groupId, userId) {
    try {
      console.log('🔄 Leaving group...');
      
      const response = await this.axiosInstance.delete(`/groups/${groupId}/members/${userId}`);

      console.log('✅ Left group successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Leave group error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ✅ Delete group - תיקון לaxiosInstance
  async deleteGroup(groupId, userId) {
    try {
      console.log('🔄 Deleting group...');
      
      const response = await this.axiosInstance.delete(`/groups/${groupId}`, {
        data: { userId }
      });

      console.log('✅ Group deleted successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Delete group error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // Update group post
  async updateGroupPost(groupId, postId, updateData, imageUri = null) {
    try {
        console.log('🔄 Updating group post...');
        
        const formData = new FormData();
        
        // הוספת נתוני הפוסט המעודכנים
        formData.append('title', updateData.title);
        formData.append('description', updateData.description || '');
        formData.append('ingredients', updateData.ingredients || '');
        formData.append('instructions', updateData.instructions || '');
        formData.append('category', updateData.category || 'General');
        formData.append('meatType', updateData.meatType || 'Mixed');
        formData.append('prepTime', updateData.prepTime?.toString() || '0');
        formData.append('servings', updateData.servings?.toString() || '1');
        formData.append('userId', updateData.userId);

        // אם יש תמונה חדשה
        if (imageUri) {
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'recipe-image.jpg',
        });
        } else if (updateData.image) {
        // שמירת התמונה הקיימת
        formData.append('image', updateData.image);
        }

        const response = await this.axiosInstance.put(`/groups/${groupId}/posts/${postId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
        });

        console.log('✅ Group post updated successfully');
        return {
        success: true,
        data: response.data
        };
        
    } catch (error) {
        console.error('❌ Update group post error:', error);
        
        if (error.code === 'ECONNABORTED') {
        return {
            success: false,
            message: 'Request timeout - please check your connection and try again'
        };
        }
        
        return {
        success: false,
        message: error.response?.data?.message || error.message
        };
    }
  }

  // ✅ תיקון בדיקות הרשאות - תמיכה ב-string ו-ObjectId
  // Check if user is member of group
  isMember(group, userId) {
    if (!group || !group.members || !userId) {
      console.log('❌ isMember: Missing data', { group: !!group, members: !!group?.members, userId });
      return false;
    }
    
    const isMember = group.members.some(member => {
      const memberId = member.userId || member._id || member.id;
      return memberId === userId || memberId?.toString() === userId?.toString();
    });
    
    console.log('🔍 isMember check:', { 
      userId, 
      groupId: group._id, 
      groupName: group.name,
      isMember, 
      membersCount: group.members.length 
    });
    return isMember;
  }

  // Check if user is admin of group
  isAdmin(group, userId) {
    if (!group || !group.members || !userId) {
      console.log('❌ isAdmin: Missing data');
      return false;
    }
    
    const isAdmin = group.members.some(member => {
      const memberId = member.userId || member._id || member.id;
      const isAdminRole = member.role === 'admin' || member.role === 'owner';
      return (memberId === userId || memberId?.toString() === userId?.toString()) && isAdminRole;
    });
    
    console.log('🔍 isAdmin check:', { userId, groupId: group._id, isAdmin });
    return isAdmin;
  }

  // Check if user is creator of group
  isCreator(group, userId) {
    if (!group || !userId) {
      console.log('❌ isCreator: Missing data');
      return false;
    }
    
    const creatorId = group.creatorId || group.creator || group.ownerId;
    const isCreator = creatorId === userId || creatorId?.toString() === userId?.toString();
    
    console.log('🔍 isCreator check:', { userId, creatorId, isCreator });
    return isCreator;
  }

  // Check if user has pending join request
  hasPendingRequest(group, userId) {
    if (!group || !group.pendingRequests || !userId) return false;
    return group.pendingRequests.some(request => {
      const requestUserId = request.userId || request._id || request.id;
      return requestUserId === userId || requestUserId?.toString() === userId?.toString();
    });
  }

  // ============ GROUP POSTS ============

  // Get posts for a specific group - עם טיפול טוב יותר בשגיאות
  async getGroupPosts(groupId, userId = null) {
    try {
      console.log('🔄 Fetching group posts for ID:', groupId);
      
      const params = userId ? { userId } : {};
      const response = await this.axiosInstance.get(`/groups/${groupId}/posts`, { 
        params,
        timeout: 15000
      });

      console.log('✅ Group posts fetched successfully:', response.data.length);
      return {
        success: true,
        data: response.data || [] // וודא שזה תמיד מערך
      };
      
    } catch (error) {
      console.error('❌ Fetch group posts error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Connection timeout - please check your network and try again'
        };
      }

      // ✅ אם זה שגיאת גישה לקבוצה פרטית, החזר מערך ריק
      if (error.response?.status === 403) {
        console.log('⚠️  Access denied to private group, returning empty array');
        return {
          success: true,
          data: [],
          message: 'This is a private group'
        };
      }

      // ✅ אם הקבוצה לא נמצאה, החזר מערך ריק
      if (error.response?.status === 404) {
        console.log('⚠️  Group not found, returning empty array');
        return {
          success: true,
          data: [],
          message: 'Group not found'
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // Create post in group
  async createGroupPost(groupId, postData, imageUri = null) {
    try {
      console.log('🔄 Creating group post...');
      console.log('📋 Post data:', { groupId, userId: postData.userId, imageUri: !!imageUri });
      
      const formData = new FormData();
      
      // הוספת נתוני הפוסט
      formData.append('title', postData.title);
      formData.append('description', postData.description || '');
      formData.append('ingredients', postData.ingredients || '');
      formData.append('instructions', postData.instructions || '');
      formData.append('category', postData.category || 'General');
      formData.append('meatType', postData.meatType || 'Mixed');
      formData.append('prepTime', postData.prepTime?.toString() || '0');
      formData.append('servings', postData.servings?.toString() || '1');
      formData.append('userId', postData.userId);

      // הוספת תמונה אם יש
      if (imageUri) {
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'recipe-image.jpg',
        });
      }

      console.log('📤 Sending request to create group post...');
      const response = await this.axiosInstance.post(`/groups/${groupId}/posts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('✅ Group post created successfully:', response.data.message);
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Create group post error:', error);
      
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          message: 'Request timeout - please check your connection and try again'
        };
      }
      
      // הצגת שגיאות מפורטות מהשרת
      if (error.response?.data?.message) {
        console.log('❌ Server error message:', error.response.data.message);
        return {
          success: false,
          message: error.response.data.message
        };
      }
      
      return {
        success: false,
        message: error.message || 'Failed to create group post'
      };
    }
  }

  // Delete group post
  async deleteGroupPost(groupId, postId, userId) {
    try {
      console.log('🔄 Deleting group post...');
      
      const response = await this.axiosInstance.delete(`/groups/${groupId}/posts/${postId}`, {
        data: { userId }
      });

      console.log('✅ Group post deleted successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Delete group post error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // ============ GROUP POSTS INTERACTIONS ============

  // Like group post
  async likeGroupPost(groupId, postId, userId) {
    try {
      console.log('👍 Liking group post...');
      
      const response = await this.axiosInstance.post(`/groups/${groupId}/posts/${postId}/like`, {
        userId
      });

      console.log('✅ Group post liked successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Like group post error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // Unlike group post
  async unlikeGroupPost(groupId, postId, userId) {
    try {
      console.log('👎 Unliking group post...');
      
      const response = await this.axiosInstance.delete(`/groups/${groupId}/posts/${postId}/like`, {
        data: { userId }
      });

      console.log('✅ Group post unliked successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Unlike group post error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // Add comment to group post
  async addCommentToGroupPost(groupId, postId, commentData) {
    try {
      console.log('💬 Adding comment to group post...');
      
      const response = await this.axiosInstance.post(`/groups/${groupId}/posts/${postId}/comments`, commentData);

      console.log('✅ Comment added to group post successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Add comment to group post error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  // Delete comment from group post
  async deleteCommentFromGroupPost(groupId, postId, commentId, userId) {
    try {
      console.log('🗑️ Deleting comment from group post...');
      
      const response = await this.axiosInstance.delete(`/groups/${groupId}/posts/${postId}/comments/${commentId}`, {
        data: { userId }
      });

      console.log('✅ Comment deleted from group post successfully');
      return {
        success: true,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ Delete comment from group post error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }
}

export const groupService = new GroupService();