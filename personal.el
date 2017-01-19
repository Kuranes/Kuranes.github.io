;; make PC keyboard's Win key or other to type Super or Hyper, for emacs running on Windows.

(require 'use-package)

(setq w32-pass-lwindow-to-system nil)
(setq w32-lwindow-modifier 'super) ; Left Windows key

(setq w32-pass-rwindow-to-system nil)
(setq w32-rwindow-modifier 'super) ; Right Windows key

(setq w32-pass-apps-to-system nil)
(setq w32-apps-modifier 'hyper) ; Menu/App key

;; make ctrl-z undo
(global-set-key (kbd "C-z") 'undo)
;; make ctrl-Z redo
(defalias 'redo 'undo-tree-redo)
(global-set-key (kbd "C-S-z") 'redo)

(require 'rainbow-delimiters)
(add-hook 'prog-mode-hook 'rainbow-delimiters-mode)

(require 'rainbow-identifiers)
(add-hook 'prog-mode-hook 'rainbow-identifiers-mode)

(require 'indent-guide)
(add-hook 'prog-mode-hook 'indent-guide-mode)


(cua-mode t)
(setq cua-auto-tabify-rectangles nil) ;; Don't tabify after rectangle commands
(transient-mark-mode 1) ;; No region when it is not highlighted
(setq cua-keep-region-after-copy t) ;; Standard Windows behaviour

(desktop-save-mode 1)

(defcustom preferred-javascript-mode
  (first (remove-if-not #'fboundp '(js2-mode js-mode)))
  "Javascript mode to use for .js files."
  :type 'symbol
  :group 'programming
  :options '(js2-mode js-mode))
;; Need to first remove from list if present, since elpa adds entries too, which
;; may be in an arbitrary order
(eval-when-compile (require 'cl))
(setq auto-mode-alist (cons `("\\.\\(js\\|es6\\)\\(\\.erb\\)?\\'" . ,preferred-javascript-mode)
                            (loop for entry in auto-mode-alist
                                  unless (eq preferred-javascript-mode (cdr entry))
                                  collect entry)))
(if (fboundp 'with-eval-after-load)
    (defalias 'after-load 'with-eval-after-load)
  (defmacro after-load (feature &rest body)
    "After FEATURE is loaded, evaluate BODY."
    (declare (indent defun))
    `(eval-after-load ,feature
       '(progn ,@body))))

(after-load 'js2-mode
            ;; Disable js2 mode's syntax error highlighting by default...
            (setq-default js2-mode-show-parse-errors nil
                          js2-mode-show-strict-warnings nil)
            )

(add-hook 'js2-mode-hook (lambda () (setq mode-name "JS2")))

(require 'flycheck)
(add-hook 'js2-mode-hook
          (lambda () (flycheck-mode t)))

(require 'web-beautify)

(add-hook 'js2-mode-hook          (lambda () (add-hook 'before-save-hook 'web-beautify-js-buffer t t))          )

(add-hook 'js2-mode-hook (lambda () (tern-mode t)))

(add-hook 'json-mode-hook
          (lambda ()
            (add-hook 'before-save-hook 'web-beautify-js-buffer t t)))

(toggle-scroll-bar -1)
(counsel-projectile-on)

;;(require 'js2-highlight-vars)
;;(if (featurep 'js2-highlight-vars) (js2-highlight-vars-mode))

                                        ;(require 'editorconfig)
                                        ;(editorconfig-mode 1)


(require 'smart-forward)
;; Disable guru-mode (I like using arrows :p)
(setq prelude-guru nil)

;;(global-set-key (kbd "<prior>") 'beginning-of-buffer)
;;(global-set-key (kbd "<home>") 'beginning-of-buffer)
;;(global-set-key (kbd "<next>") 'end-of-buffer)
;;(global-set-key (kbd "<end>") 'end-of-buffer)
(global-set-key (kbd "M-p") 'backward-paragraph)
(global-set-key (kbd "M-n") 'forward-paragraph)

(global-set-key (kbd "M-<up>") 'smart-up)
(global-set-key (kbd "M-<down>") 'smart-down)
(global-set-key (kbd "M-<left>") 'smart-backward)
(global-set-key (kbd "M-<right>") 'smart-forward)

;; Webjump let's you quickly search google, wikipedia, emacs wiki
;;(global-set-key (kbd "C-x g") 'webjump)
(global-set-key (kbd "C-x M-g") 'browse-url-at-point)

;; Completion at point
(global-set-key (kbd "C-<tab>") 'completion-at-point)

;; Like isearch, but adds region (if any) to history and deactivates mark
;;(global-set-key (kbd "C-s") 'isearch-forward-use-region)
;;(global-set-key (kbd "C-r") 'isearch-backward-use-region)

(use-package swiper
             :ensure t
             :config
             (ivy-mode 1)
             (setq ivy-use-virtual-buffers t)
             (global-set-key "\C-s" 'swiper)
             (global-set-key (kbd "C-x b") 'ivy-switch-buffer)
             (global-set-key (kbd "C-c C-r") 'ivy-resume)
             (global-set-key (kbd "M-x") 'counsel-M-x)
             (global-set-key (kbd "C-x C-f") 'counsel-find-file))

(setq ivy-display-style 'fancy)
;;(define-key swiper-map (kbd "C-S")
;;  (lambda () (interactive) (insert (format "\\<%s\\>" (with-ivy-window (thing-at-point 'symbol))))))
;; This file contains configuration for anything that takes place inside buffers
;; in regards to editing, formatting etc.


;;; Code:

(add-hook 'c-mode-common-hook '(lambda () (c-toggle-auto-state 1)))
(setq-default c-basic-offset 4
              tab-width 4
              indent-tabs-mode nil)

(setq c-default-style "bsd")


(require 'glsl-mode)

(setq glsl-default-style "bsd")
(setq glsl-basic-offset 4)
(setq glsl-mode-basic-offset 4)

(require 'ibuffer-vc)
;(require-package 'ibuffer-git)
;; sort ibuffer
(add-hook 'ibuffer-hook
          (lambda ()
            (ibuffer-vc-set-filter-groups-by-vc-root)
            (unless (eq ibuffer-sorting-mode 'alphabetic)
              (ibuffer-do-sort-by-alphabetic))))

(setq mode-require-final-newline nil)

;;(require 'clipmon)
;;(clipmon-mode 1)

(require 'clippy)
