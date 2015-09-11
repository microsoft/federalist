var Backbone = require('backbone');
var _ = require('underscore');
var markdown = require('markdown').markdown;
var htmlToMarkdown = require('to-markdown');
var yaml = require('js-yaml');

var DocumentModel = Backbone.Model.extend({
  initialize: function (opts) {
    var self          = this,
        parts         = opts.markdown.split('---\n');
    this.content      = '';
    this.frontMatter  = {};

    if (parts[0] !== '') {
      this.content = opts.markdown;
      return this;
    }
    this.frontMatter = yaml.safeLoad(parts[1]);
    this.content = parts[2];
    return this;
  },
  toMarkdown: function () {
    var y = yaml.safeDump(this.frontMatter),
        x = '---\n';
    return [x, y, x, this.content].join('');
  },
  toSirTrevorJson: function () {
    var blocks = [],
        mdTree;

    mdTree = markdown.parse(this.content).slice(1);
    for (var i = 0; i < mdTree.length; i++) {
      blocks.push(jsonMLToBlock(mdTree[i]));
    }
    return { data: blocks };
  },
  toSirTrevorJsonString: function () {
    return JSON.stringify(this.toSirTrevorJson());
  },
  updateContentFromSirTrevorJson: function (stJson) {
    var result = stJson.data.map(function(b) {
      var htmlString = blockToHTMLString(b)
      return htmlString;
    }).join('\n');
    this.content = htmlToMarkdown(result);
  },
  updateFrontMatter: function (frontMatter) {
    if (!frontMatter) return this;
    this.frontMatter = frontMatter;
    return this;
  }
});

function jsonMLToBlock (j) {
  // Takes a jsonML representation from the markdown parser
  // and converts it into a format that Sir Trevor will be
  // able to render as a block
  var block = {
    type: '',
    data: {
      'format': 'html'
    }
  };

  if (j[0] === 'header') {
    block.type = 'h' + j[1].level;
    block.data.text = j[2]; //'<p>' + j[2] + '</p>';
  }
  else if (j[0] === 'para') {
    block.type = 'text';
    block.data.text = markdown.toHTML(j); //'<p>' + markdown.toHTML(j) + '</p>';
  }

  return block;
}

function blockToHTMLString (b) {
  // Takes a Sir Trevor block from the editor and converts it
  // to an HTML string representation for the markdown converter
  var div = document.createElement('div'),
      htmlString, tagName, insideHTML;

  if (_.contains(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], b.type)) {
    tagName = b.type;
    div.innerHTML = b.data.text;
    if (div.children[0].tagName.toLowerCase() === 'p') {
      insideHTML = div.children[0].innerHTML;
    }

    htmlString = '<' + tagName + '>' + insideHTML + '</' + tagName + '>';
  }
  else if (b.type === 'text') {
    // this is just a straight 'para' or <p>
    htmlString = b.data.text;
  }
  else if (_.contains(['unordered', 'ordered'], b.type)) {
    // if it is a list of either type, iterate through the items
    // and create li strings
    (b.type === 'unordered') ? tagName = 'ul' : tagName = 'ol';
    insideHTML = b.data.listItems.map(function(li) {
      return '<li>' + li.content + '</li>';
    }).join('');

    htmlString = '<' + tagName + '>' + insideHTML + '</' + tagName + '>';
  }

  return htmlString;
}


module.exports = DocumentModel;