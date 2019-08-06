import { Component } from 'react';
import { WithContext as ReactTags } from 'react-tag-input';
import { ChromePicker } from 'react-color';
import Layout from '../components/layout';

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

export default class Options extends Component {
  constructor(props) {
    super(props);
    this.ipcRenderer = global.ipcRenderer;
    this.state = {
      tags: [],
      suggestions: [
        { id: 'landscape', text: 'landscape' },
        { id: 'sky', text: 'sky' },
        { id: 'clouds', text: 'clouds' },
        { id: 'tree', text: 'tree' },
        { id: 'water', text: 'water' },
        { id: 'grass', text: 'grass' },
        { id: 'animal', text: 'animal' },
        { id: 'sunset', text: 'sunset' },
        { id: 'nobody', text: 'nobody' },
        { id: 'scenic', text: 'scenic' },
        { id: 'flowers', text: 'flowers' },
        { id: 'city', text: 'city' },
        { id: 'building', text: 'building' },
        { id: 'bird', text: 'bird' },
        { id: 'feathers', text: 'feathers' },
        { id: 'stairs', text: 'stairs' },
        { id: 'forest', text: 'forest' }
      ],
      options:
        (this.ipcRenderer && this.ipcRenderer.sendSync('get-options')) || []
    };

    this.handleRating = this.handleRating.bind(this);
    this.handleTags = this.handleTags.bind(this);
    this.handleTimeInterval = this.handleTimeInterval.bind(this);
    this.handleRunOnBoot = this.handleRunOnBoot.bind(this);
    this.like = this.like.bind(this);

    this.handleDelete = this.handleDelete.bind(this);
    this.handleAddition = this.handleAddition.bind(this);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);
  }

  componentDidMount() {
    this.setState(state => {
      return {
        tags: state.options.tags.map(val => ({ id: val, text: val }))
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

  handleRating({ target }) {
    this.ipcRenderer.send('set-rating', target.value);
    this.setState(state => ({
      options: { ...state.options, rating: target.value }
    }));
  }

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

  handleRunOnBoot({ target }) {
    this.ipcRenderer.send('set-runOnBoot', target.value === 'true');
    this.setState(prev => ({
      options: { ...prev.options, runOnBoot: target.value === 'true' }
    }));
  }

  like() {
    this.ipcRenderer.send('set-like');
  }

  handleChangeComplete({ rgb }) {
    const hex = rgba2hex(rgb);
    console.log(hex);
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
                />
              </div>
            </div>

            <div className="option">
              <h3>Wallpaper rating</h3>
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
                <select
                  onChange={this.handleRunOnBoot}
                  value={
                    typeof this.state.options.runOnBoot === 'undefined'
                      ? 'false'
                      : this.state.options.runOnBoot.toString()
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="option">
              <h3>Additional options</h3>
              <div className="unflex">
                <div>
                  <button onClick={() => this.like}>
                    Add current illustration to like list
                  </button>
                </div>
                <div>
                  <h4>Taskbar Color (Windows only)</h4>
                  <ChromePicker onChangeComplete={this.handleChangeComplete} />
                </div>
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
              height: 30px;
              outline: none;
              border: 0;
              background-color: #3f4142;
              color: #fff;
              cursor: pointer;
              box-shadow: 0 0 20px 0px #5f5f5f;
            }
            .option {
              padding: 10px;
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
