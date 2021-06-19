;
(() => {
  // FIXME: Should use uuid instead of index as key for storage
  /** DB
   * {
   *   version: <number>,
   *   list: [{
   *       content: <string>
   *       time: <number>
   *   }]
   * }
   **/

  const newtab_script = () => {
    const $textarea = document.querySelector('textarea')
    const $create_entry = document.querySelector('#create_entry')
    const $create_entry_2 = document.querySelector('#create_entry_2')

    let currentNoteId = 0
    let data = null

    const _emptyNote = () => {
      const emptyNote = Object.create(null)
      emptyNote.content = ''
      emptyNote.time = (new Date()).getTime()
      return emptyNote
    }

    const _render = () => {
      const _renderList = list => {
        const _makeTitleString = content => content.substr(0, 21).replace(/\n/g, ' ').trim() || '<span class="empty-string">(EMPTY)</span>'
        const _makeTruncTitleString = content => content.substr(0, 18).replace(/\n/g, ' ').trim() || '<span class="empty-string">(EMPTY)</span>'
        const $ul = document.querySelector('ul')

        $ul.innerHTML = list.sort((a, b) => b.time - a.time).map((item, index) => {
          let title = _makeTitleString(item.content)
          let truncTitle = _makeTruncTitleString(item.content)
          let className = index === currentNoteId ? 'current' : ''
          if (item.content.length > 21) {
            return `<li class="${className}" data-id="${index}"><span>${truncTitle}...<div class='del'></div></span></li>`
          } else {
            return `<li class="${className}" data-id="${index}"><span>${title}<div class='del'></div></span></li>`
          }
        }).join('')

        $ul.querySelectorAll('li').forEach(function ($li, index) {
          $li.addEventListener('click', function (event) {
            if (event.target.classList.contains('del')) {
              const currentNote = list[index]
              if (currentNote.content !== '') {
                const noteTitle = _makeTitleString(currentNote.content)
                const deleteConfirmString = `Do you want to delete "${noteTitle}"?\nThis can't be undone.`
                if (!confirm(deleteConfirmString)) {
                  return
                }
              }

              if (index === 0 && data.list.length === 1) {
                data.list = [_emptyNote()]
              } else {
                data.list = data.list.filter((note, i) => i !== index)
                if (currentNoteId >= data.list.length) {
                  currentNoteId = data.list.length - 1
                }
              }

              browser.storage.local.set({
                list: data.list
              })

              _render()
              return
            }

            if (currentNoteId === index) {
              return
            }
            currentNoteId = index
            _render()
          })
        })
      }

      const _renderNote = note => {
        $textarea.value = note.content || ''
        $textarea.focus()
      }

      _renderList(data.list)
      _renderNote(data.list[currentNoteId])
    }

    const _enableAnimation = () => {
      setTimeout(() => {
        document.querySelector('style').innerHTML += `
          .create_entry, .del, #list, #list li > span, #list-trigger span, #note-content {
            transition-duration: .2s;
          }
        `
      }, 300)
    }

    const _initListHiding = () => {
      document.onkeydown = function (evt) {
        evt = evt || window.event;
        _isEscape = (evt.key === "Escape" || evt.key === "Esc");
        if (_isEscape) {
          if (document.getElementById('list-indicator').checked === true) {
            document.getElementById('list-indicator').checked = false;
            $textarea.focus();
          } else if (document.getElementById('list-indicator')) {
            document.getElementById('list-indicator').checked = true;
          }
        }
      };
      const _hideList = () => {
        if (document.getElementById('list-indicator').checked === true) {
          document.getElementById('list-indicator').checked = false;
        }
      };
      $textarea.onclick = _hideList;
      $textarea.oninput = _hideList;
      $textarea.onkeydown = function (evt) {
        evt = evt || window.event;
        _isCaretNav = (evt.key === "ArrowDown" ||
          evt.key === "Down" ||
          evt.key === "ArrowLeft" ||
          evt.key === "Left" ||
          evt.key === "ArrowRight" ||
          evt.key === "Right" ||
          evt.key === "ArrowUp" ||
          evt.key === "Up" ||
          evt.key === "End" ||
          evt.key === "Home");
        if (_isCaretNav && document.activeElement == $textarea) {
          _hideList()
        }
      };
    }

    const _noteEventHandler = () => {
      // auto saving and indicator
      let write_timeout
      $textarea.addEventListener('keyup', () => {
        if (data.list[currentNoteId].content === $textarea.value) {
          return
        }

        clearTimeout(write_timeout)
        write_timeout = setTimeout(() => {

          data.list[currentNoteId].content = $textarea.value
          data.list[currentNoteId].time = (new Date()).getTime()
          currentNoteId = 0
          browser.storage.local.set({
            list: data.list
          })
          _render()
        }, 250)
      })
      $textarea.focus()
    }

    const _createButtonEventHandler = () => {
      $create_entry.addEventListener('click', () => {
        currentNoteId = 0
        data.list = [_emptyNote(), ...data.list]
        browser.storage.local.set({
          list: data.list
        })

        _render()
      })
      $create_entry_2.addEventListener('click', () => {
        currentNoteId = 0
        data.list = [_emptyNote(), ...data.list]
        browser.storage.local.set({
          list: data.list
        })

        _render()
      })
    }

    const _multiTabHandler = () => {
      const loadLatestData = async updateTabInfo => {
        let currentTabInfo = await browser.tabs.getCurrent()

        if (typeof updateTabInfo === 'object') { // tab switch
          if (currentTabInfo.id !== updateTabInfo.tabId || currentTabInfo.windowId !== updateTabInfo.windowId) {
            return
          }
        } else { // window
          if (currentTabInfo.windowId !== updateTabInfo) {
            return
          }
        }

        data = await window.utils.loadPreference()
        _render()
      }
      browser.tabs.onActivated.addListener(loadLatestData)
      // XXX: Window event causing double click issue, should temporarily comment it when default open sidebar...
      browser.windows.onFocusChanged.addListener(loadLatestData)
    }

    const _initEventHandler = () => {
      _noteEventHandler()
      _createButtonEventHandler()
      _multiTabHandler()
      _initListHiding()
    }

    const init = async () => {
      data = await window.utils.loadPreference()

      _render()
      _initEventHandler()
      _enableAnimation()
    }
    return {
      init: init
    }
  }
  window.addEventListener('load', () => {
    newtab_script().init();
  })
})()