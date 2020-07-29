const queries = require('./queries');
const ONE = 1;

class Database {
  constructor(db) {
    this.db = db;
  }

  get(query) {
    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  }

  exec(query) {
    return new Promise((resolve, reject) => {
      this.db.exec(query, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  all(query) {
    return new Promise((resolve, reject) => {
      this.db.all(query, (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      });
    });
  }

  createStory(authorId, title, content) {
    return new Promise((resolve, reject) => {
      this.get('SELECT id FROM stories ORDER BY id DESC')
        .then((row) => {
          const id = row ? row.id + ONE : ONE;
          this.exec(queries.insertNewStory(id, authorId, title, content))
            .then(() => resolve(id))
            .catch((err) => reject(err));
        })
        .catch((err) => reject(err));
    });
  }

  async updateStory(storyId, title, authorId, content) {
    const query = queries.saveStory(storyId, title, content);
    const row = await this.getDraft(storyId, authorId);
    if (!row) {
      return {error: 'unknown id'};
    }
    await this.exec(query);
    return {status: 'updated'};
  }

  getDrafts(userId) {
    return this.all(queries.getDrafts(userId));
  }

  addUser({id, name, avatar_url}) {
    return new Promise((resolve, reject) => {
      this.db.run(queries.insertUser(id, name, avatar_url), (err) => {
        if (err) {
          return reject(err);
        }
        resolve({status: 'added user'});
      });
    });
  }

  async getUserDetails(id) {
    return new Promise((resolve, reject) => {
      this.get(queries.getUserDetails(id)).then((userDetails) => {
        if (!userDetails) {
          return reject({error: 'unknown id'});
        }
        resolve(userDetails);
      });
    });
  }

  getDraft(draftId, authorId) {
    return this.get(queries.getDraft(authorId, draftId));
  }

  publish(authorId, storyId) {
    return new Promise((resolve, reject) => {
      this.getDraft(storyId, authorId).then((row) => {
        if (!row) {
          return reject({error: 'No draft found'});
        }
        if (!row.title.trim() && !JSON.parse(row.content).length) {
          const error = 'Cannot publish a story with empty title and content';
          return reject({error});
        }
        this.exec(queries.publish(storyId))
          .then(() => resolve({status: 'published'}))
          .catch(() => reject({error: 'Already published'}));
      });
    });
  }

  getUserPublishedStories(userId) {
    return this.all(queries.getUserPublishedStories(userId));
  }

  getPublishedStoryDetails(id) {
    return new Promise((resolve, reject) => {
      this.get(queries.getPublishedStoryDetails(id)).then((storyDetails) => {
        if (!storyDetails) {
          return reject({error: 'unknown id'});
        }
        this.get(queries.getResponsesCount(id)).then((responsesCount) => {
          storyDetails.responsesCount = responsesCount.count;
          resolve(storyDetails);
        });
      });
    });
  }

  getResponses(storyId) {
    return new Promise((resolve, reject) => {
      this.get(queries.getPublishedStory(storyId))
        .then((story) => {
          if (!story) {
            return reject({error: 'unknown id'});
          }
          this.all(queries.getResponses(storyId)).then((responses) =>
            resolve(responses.reverse())
          );
        })
        .catch((err) => reject(err));
    });
  }

  async followAuthor(followerId, authorId) {
    if (followerId === authorId) {
      throw {error: 'You cannot follow yourself'};
    }
    const author = await this.get(queries.getUserDetails(authorId));
    if (!author) {
      throw {error: 'No author found'};
    }
    const follower = await this.get(queries.getFollower(authorId, followerId));
    if (follower) {
      throw {error: 'Already following'};
    }
    await this.exec(queries.addFollower(authorId, followerId));
    return {status: 'following'};
  }

  getFollowingStories(userId) {
    return this.all(queries.followingStories(userId));
  }

  addResponse(storyId, userId, response) {
    return new Promise((resolve, reject) => {
      this.get(queries.getPublishedStory(storyId)).then((story) => {
        if (!story) {
          return reject({error: 'unknown id'});
        }
        this.exec(queries.addResponse(storyId, userId, response)).then(() =>
          resolve({status: 'added'})
        );
      });
    });
  }
}

module.exports = Database;
