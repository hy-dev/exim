// Optimistic update
// - Forum
// list of posts & textarea with "submit" button

// - Create new post on forum
// 1. Optimistically append it to the current thread
// 2. Make request to the server
// 3. If the request was failed: remove the post; return text to the textarea

var actions = Exim.createActions(['createPost']);

var PostStore = Exim.createStore({
  createPost: {
    will: (data) =>
      var posts = this.get('posts')
      posts.push(data)
      this.update({posts: posts})

    on: (data) =>
      // Returns promise.
      return request.post('/v1/posts', data)

    didNot: (error, newPost) =>
      // Remove the new post from the store.
      var filtered = this.get('posts')
        .filter(p => p.date !== newPost.date)
      this.update({posts: filtered})

    while: (status) =>
      this.update({isSaving: status})
  }
});


var ThreadComponent = React.createComponent({
  mixins: [Exim.connect(PostStore, 'posts', 'isSaving')],
  savePost: => {
    var text = this.state.text;
    if (!text) return;
    actions.createPost({text: text, date: Date.now()})
  },

  render: => {
    var posts = this.state.posts.map(p => <li>p</li>);
    var isSaving = this.state.isSaving;
    var submit = isSaving ?
        <button disabled=true><span className="spinner"></span></button>
      : <button onClick={this.savePost}>Save</button>;

    return <div>
      <h2>Total posts: {posts.length}</h2>
      {posts}
      <textarea disabled={isSaving} valueLink={this.linkState('text')} />
      {button}
    </div>
  }
})
