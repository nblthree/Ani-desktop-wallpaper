import { Component } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import { ChromePicker } from 'react-color';
import Switch from 'react-switch';
import Layout from '../components/layout';
import tags from '../data/tag';

const KeyCodes = {
  comma: 188,
  enter: 13
};

const delimiters = [KeyCodes.comma, KeyCodes.enter];

const rgba2hex = ({ r, g, b, a }) => {
  let hex =
    (r | (1 << 8)).toString(16).slice(1) +
    (g | (1 << 8)).toString(16).slice(1) +
    (b | (1 << 8)).toString(16).slice(1);
  a = ((a * 255) | (1 << 8)).toString(16).slice(1);
  hex = a + hex;

  return hex;
};

const getQueryIndex = (query, item) => {
  return item.id.indexOf(query.toLowerCase());
};

const filterSuggestions = (query, suggestions) => {
  const results = [];
  for (let i = 0; i < suggestions.length; i++) {
    const index = getQueryIndex(query, suggestions[i]);
    if (index === 0) {
      results.unshift(suggestions[i]);
      if (results.length > 7) {
        break;
      }
    }
  }

  return results;
};

export default class Options extends Component {
  constructor(props) {
    super(props);
    this.ipcRenderer = global.ipcRenderer;
    this.state = {
      tags: [],
      suggestions: tags,
      runOnBoot: false,
      loopOverLikeList: false,
      options:
        (this.ipcRenderer && this.ipcRenderer.sendSync('get-options')) || []
    };

    // This.handleRating = this.handleRating.bind(this);
    this.handleTags = this.handleTags.bind(this);
    this.handleTimeInterval = this.handleTimeInterval.bind(this);
    this.handleRunOnBoot = this.handleRunOnBoot.bind(this);
    this.handleLoopOverLikeList = this.handleLoopOverLikeList.bind(this);
    this.like = this.like.bind(this);

    this.handleDelete = this.handleDelete.bind(this);
    this.handleAddition = this.handleAddition.bind(this);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);
  }

  componentDidMount() {
    this.setState(state => {
      return {
        tags: state.options.tags.map(val => ({ id: val, text: val })),
        runOnBoot: state.options.runOnBoot,
        loopOverLikeList: state.options.loopOverLikeList
      };
    });
  }

  handleDelete(i) {
    const { tags } = this.state;
    this.setState(
      {
        tags: tags.filter((tag, index) => index !== i)
      },
      this.handleTags
    );
  }

  handleAddition(tag) {
    this.setState(state => ({ tags: [...state.tags, tag] }), this.handleTags);
  }

  /* HandleRating({ target }) {
    this.ipcRenderer.send('set-rating', target.value);
    this.setState(state => ({
      options: { ...state.options, rating: target.value }
    }));
  } */

  handleTags() {
    const tags = this.state.tags.map(val => val.id);
    this.ipcRenderer.send('set-tags', tags);
  }

  handleTimeInterval({ target }) {
    this.ipcRenderer.send('set-timeInterval', target.value);
    this.setState(prev => ({
      options: { ...prev.options, timeInterval: target.value }
    }));
  }

  handleRunOnBoot(checked) {
    this.ipcRenderer.send('set-runOnBoot', checked);
    this.setState(prev => ({
      options: { ...prev.options, runOnBoot: checked },
      runOnBoot: checked
    }));
  }

  handleLoopOverLikeList(checked) {
    this.ipcRenderer.send('set-loopOverLikeList', checked);
    this.setState(prev => ({
      options: { ...prev.options, loopOverLikeList: checked },
      loopOverLikeList: checked
    }));
  }

  like() {
    this.ipcRenderer.send('set-like');
  }

  handleChangeComplete({ rgb }) {
    const hex = rgba2hex(rgb);
    this.ipcRenderer.send('set-taskbarColor', hex);
  }

  render() {
    return (
      <Layout>
        <div>
          <div className="options">
            <div className="option">
              <h3>Chose tags (Best to use just one tag and at most two)</h3>
              <div className="flex">
                <ReactTags
                  tags={this.state.tags}
                  suggestions={this.state.suggestions}
                  allowDragDrop={false}
                  handleDelete={this.handleDelete}
                  handleAddition={this.handleAddition}
                  delimiters={delimiters}
                  handleFilterSuggestions={filterSuggestions}
                  labelField="id"
                />
              </div>
            </div>
            {/*
            <div className="option">
              <h3>Illustration rating</h3>
              <div className="flex">
                <select
                  onChange={this.handleRating}
                  value={this.state.options.rating}
                >
                  <option value="s">Safe</option>
                  <option value="q">Questionable</option>
                  <option value="e">Explicit</option>
                  <option value="u">Unset</option>
                </select>
              </div>
            </div>
        */}
            <div className="option">
              <h3>Time interval before setting a new Wallpaper.</h3>
              <div className="flex">
                <select
                  onChange={this.handleTimeInterval}
                  value={this.state.options.timeInterval}
                >
                  <option value="0.5">30 seconds</option>
                  <option value="1">1 minutes</option>
                  <option value="2">2 minutes</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="40">40 minutes</option>
                  <option value="50">50 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="0">On boot</option>
                </select>
              </div>
            </div>

            <div className="option">
              <h3>Run on boot</h3>
              <div className="flex">
                <label htmlFor="run-on-boot-switch">
                  <Switch
                    onChange={this.handleRunOnBoot}
                    checked={Boolean(this.state.runOnBoot)}
                    onColor="#3c3c3c"
                    offColor="#101010"
                    onHandleColor="#f3f3f3"
                    offHandleColor="#676767"
                    handleDiameter={18}
                    uncheckedIcon={false}
                    checkedIcon={false}
                    boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                    activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                    height={26}
                    width={60}
                    className="react-switch"
                    id="run-on-boot-switch"
                  />
                </label>
              </div>
            </div>

            <div className="option">
              <h3>Like List</h3>
              <div className="unflex">
                <label htmlFor="like-list-switch">
                  <h4>Loop over Like List</h4>
                  <Switch
                    onChange={this.handleLoopOverLikeList}
                    checked={Boolean(this.state.loopOverLikeList)}
                    onColor="#3c3c3c"
                    offColor="#101010"
                    onHandleColor="#f3f3f3"
                    offHandleColor="#676767"
                    handleDiameter={18}
                    uncheckedIcon={false}
                    checkedIcon={false}
                    boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                    activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                    height={26}
                    width={60}
                    className="react-switch"
                    id="like-list-switch"
                  />
                </label>
                <div>
                  <button onClick={() => this.like()}>
                    Add current illustration to the Like List
                  </button>
                </div>
              </div>
            </div>

            <div className="option">
              <h3>Taskbar Color (Windows only)</h3>
              <div className="flex">
                <ChromePicker onChangeComplete={this.handleChangeComplete} />
              </div>
            </div>
          </div>
          <style global jsx>{`
            .ReactTags__tags {
              width: 100%;
            }
            .ReactTags__activeSuggestion {
              color: #fff;
            }
            .ReactTags__suggestions {
              color: #fff;
            }
            .ReactTags__tag {
              margin: 0 10px 0 0px;
              font-weight: 700;
              color: #fff;
              cursor: default;
            }
            .ReactTags__remove {
              padding: 0 2px 0 2px;
              cursor: pointer;
            }
            .ReactTags__tagInputField {
              width: 100%;
              max-width: 400px;
              outline: none;
              border: 0;
              height: 25px;
              padding-left: 10px;
            }
            .ReactTags__tagInput {
              margin-top: 5px;
            }
            .ReactTags__suggestions {
            }
          `}</style>
          <style jsx>{`
            .flex {
              display: flex;
              margin-left: 20px;
            }
            .unflex {
              margin-left: 20px;
            }
            .unflex > div {
              margin-top: 20px;
            }
            .unflex button {
              height: 32px;
              outline: none;
              border: 0;
              background-color: #191919;
              color: #fff;
              cursor: pointer;
              box-shadow: inset 0 0 4px 0px #4a4a4a;
            }
            .option {
              padding: 10px 10px 20px 10px;
              border-bottom: 1px solid #2f2f2f;
            }
            option {
              font-weight: normal;
            }
            select {
              display: block;
              font-size: 16px;
              font-family: sans-serif;
              font-weight: 700;
              color: #fff;
              line-height: 1.3;
              padding: 0.3em 0.7em 0.25em 0.4em;
              min-width: 20%;
              max-width: 100%;
              box-sizing: border-box;
              margin: 0;
              border: 1px solid #2b2b2b;
              box-shadow: 0 1px 0 1px rgba(0, 0, 0, 0.04);
              appearance: none;
              background-color: #1a1b1b;
              outline: none;
            }
            .select-css::-ms-expand {
              display: none;
            }
            .select-css:hover {
              border-color: #888;
            }
            .select-css:focus {
              border-color: #aaa;
              box-shadow: 0 0 1px 3px rgba(59, 153, 252, 0.7);
              box-shadow: 0 0 0 3px -moz-mac-focusring;
              color: #222;
              outline: none;
            }
          `}</style>
        </div>
      </Layout>
    );
  }
}
